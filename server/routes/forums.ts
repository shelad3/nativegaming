import express from 'express';
import ForumCategory from '../models/ForumCategory';
import ForumThread from '../models/ForumThread';
import ForumPost from '../models/ForumPost';
import User from '../models/User';
import { logActivity, checkAchievements } from '../services/gamificationService';

const router = express.Router();

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await ForumCategory.find().sort({ order: 1 });
        res.json(categories);
    } catch (err) {
        console.error('[FORUM] Categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Create/Get threads in a category
router.get('/threads', async (req, res) => {
    const { categoryId, query, sort = 'recent' } = req.query;
    try {
        let filter: any = {};
        if (categoryId) filter.categoryId = categoryId;
        if (query) filter.$text = { $search: query as string };

        const sortOptions: any = {
            recent: { lastActivity: -1 },
            hot: { 'stats.replyCount': -1 },
            votes: { 'stats.upvotes.length': -1 }
        };

        const threads = await ForumThread.find(filter)
            .sort({ isPinned: -1, ...(sortOptions[sort as string] || sortOptions.recent) })
            .limit(50);

        // Populate author names
        const authorIds = threads.map(t => t.authorId);
        const users = await User.find({ _id: { $in: authorIds } });

        const threadsWithAuthors = threads.map(t => {
            const user = users.find(u => u._id.toString() === t.authorId);
            return {
                ...t.toObject(),
                authorName: user?.username,
                authorAvatar: user?.avatar,
                authorClanTag: (user as any)?.clanId ? 'TAG' : null // Simplified for now
            };
        });

        res.json(threadsWithAuthors);
    } catch (err) {
        console.error('[FORUM] Threads error:', err);
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
});

router.post('/threads', async (req, res) => {
    const { userId, categoryId, title, content } = req.body;
    try {
        const category = await ForumCategory.findById(categoryId);
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const user = await User.findById(userId);
        if (category.isAdminOnly && !user?.isAdmin) {
            return res.status(403).json({ error: 'Only admins can post here' });
        }

        const thread = await ForumThread.create({
            title,
            content,
            authorId: userId,
            categoryId,
            lastActivity: new Date()
        });

        res.status(201).json(thread);

        // Log and check
        await logActivity(userId, 'THREAD_CREATED', { targetId: thread._id, targetName: title });
        await checkAchievements(userId, 'FIRST_THREAD', (req as any).io);
    } catch (err) {
        console.error('[FORUM] Thread creation error:', err);
        res.status(500).json({ error: 'Failed to create thread' });
    }
});

// Get specific thread and its posts
router.get('/threads/:id', async (req, res) => {
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        // Increment views
        thread.stats.views += 1;
        await thread.save();

        const posts = await ForumPost.find({ threadId: req.params.id }).sort({ createdAt: 1 });

        // Populate authors
        const authorIds = [thread.authorId, ...posts.map(p => p.authorId)];
        const users = await User.find({ _id: { $in: authorIds } });

        const enrichAuthor = (id: string) => {
            const user = users.find(u => u._id.toString() === id);
            return {
                authorName: user?.username,
                authorAvatar: user?.avatar,
                authorRole: user?.isAdmin ? 'Admin' : 'Operator'
            };
        };

        res.json({
            ...thread.toObject(),
            ...enrichAuthor(thread.authorId),
            posts: posts.map(p => ({
                ...p.toObject(),
                ...enrichAuthor(p.authorId)
            }))
        });
    } catch (err) {
        console.error('[FORUM] Thread fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch thread' });
    }
});

// Reply to thread
router.post('/threads/:id/posts', async (req, res) => {
    const { userId, content } = req.body;
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.isLocked) return res.status(400).json({ error: 'Thread is locked' });

        const post = await ForumPost.create({
            threadId: req.params.id,
            authorId: userId,
            content
        });

        // Update thread stats
        thread.stats.replyCount += 1;
        thread.lastActivity = new Date();
        await thread.save();

        res.status(201).json(post);

        // Log and check
        await logActivity(userId, 'POST_CREATED', { targetId: req.params.id, contentPreview: content.slice(0, 100) });
        await checkAchievements(userId, 'FIRST_POST', (req as any).io);
    } catch (err) {
        console.error('[FORUM] Post error:', err);
        res.status(500).json({ error: 'Failed to post reply' });
    }
});

// Vote logic for threads
router.post('/threads/:id/vote', async (req, res) => {
    const { userId, type } = req.body; // 'up' or 'down'
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        // Remove from both first
        thread.stats.upvotes = thread.stats.upvotes.filter(id => id !== userId);
        thread.stats.downvotes = thread.stats.downvotes.length > 0 ? thread.stats.downvotes.filter(id => id !== userId) : [];

        if (type === 'up') thread.stats.upvotes.push(userId);
        if (type === 'down') thread.stats.downvotes.push(userId);

        await thread.save();
        res.json({ upvotes: thread.stats.upvotes.length, downvotes: thread.stats.downvotes.length });
    } catch (err) {
        console.error('[FORUM] Vote error:', err);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

router.delete('/threads/:id', async (req, res) => {
    const { userId } = req.query; // Auth check would normally be here
    try {
        const thread = await ForumThread.findById(req.params.id);
        const user = await User.findById(userId);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.authorId !== userId && !user?.isAdmin) return res.status(403).json({ error: 'Unauthorized deletion' });

        await ForumThread.deleteOne({ _id: req.params.id });
        await ForumPost.deleteMany({ threadId: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failure' });
    }
});

router.patch('/threads/:id', async (req, res) => {
    const { userId, title, content } = req.body;
    try {
        const thread = await ForumThread.findById(req.params.id);
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        if (thread.authorId !== userId) return res.status(403).json({ error: 'Unauthorized editing' });

        if (title) thread.title = title;
        if (content) thread.content = content;
        await thread.save();

        res.json(thread);
    } catch (err) {
        res.status(500).json({ error: 'Update failure' });
    }
});

export default router;
