
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Post from '../models/Post';
import { faker } from '@faker-js/faker';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

// Helper to get random date within last 7 days
function getRandomRecentDate() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedAI() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const aiUsers = [];
        const aiNames = ['Nexus_AI', 'CyberBot_X', 'Stream_Protocol', 'Auto_Mation', 'Logic_Core'];

        // 1. Create/Update AI Users and their Posts
        for (const name of aiNames) {
            let user = await User.findOne({ username: name });
            if (!user) {
                user = await User.create({
                    username: name,
                    email: `${name.toLowerCase()}@ai.net`,
                    password: 'ai_super_secret',
                    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
                    tier: 'LEGEND',
                    isLive: true,
                    streamTitle: `Analyzing ${faker.hacker.noun()} vectors`,
                    streamGame: 'System Override',
                    streamDescription: 'Automated gameplay simulation sequence.',
                    bio: 'Artificial Intelligence Protocol. Monitoring system.',
                    hasCompletedOnboarding: true
                });
            } else {
                user.isLive = true;
                user.streamTitle = `Analyzing ${faker.hacker.noun()} vectors`;
                await user.save();
            }
            aiUsers.push(user);
            console.log(`AI User Activated: ${name}`);

            // 2. Create AI Posts (5+ per AI)
            const numPosts = 5 + Math.floor(Math.random() * 5);
            for (let j = 0; j < numPosts; j++) {
                // Check if enough posts exist to avoid duplicates if re-run, 
                // but for seeding simplest is just create new ones or skip. 
                // We'll just create new ones for now, assuming clean db or okay with duplicates.
                await Post.create({
                    title: `[AI_LOG] ${faker.hacker.verb()} ${faker.hacker.noun()}`,
                    content: `System Log Entry: ${faker.lorem.paragraph()} \n\nCalculated Probability: ${Math.random() * 100}%`,
                    authorId: user._id,
                    authorName: user.username,
                    authorAvatar: user.avatar,
                    likes: [],
                    views: Math.floor(Math.random() * 5000),
                    gifts: [],
                    createdAt: getRandomRecentDate(),
                    isSubscriberOnly: false // AI posts usually public
                });
            }
        }

        // 3. AI Comments/Boosts/Likes on GLOBAL posts
        const allPosts = await Post.find().limit(100).sort({ createdAt: -1 });

        for (const post of allPosts) {
            // 50% chance for an AI to interact
            if (Math.random() > 0.5) {
                const randomAI = aiUsers[Math.floor(Math.random() * aiUsers.length)];

                // Add Like
                if (!post.likes.includes(randomAI._id.toString())) {
                    post.likes.push(randomAI._id.toString());
                }

                // Add Gift (Boost) - 30% chance
                if (Math.random() > 0.7) {
                    post.gifts.push({
                        from: randomAI.username,
                        type: 'AI_BOOST',
                        amount: 10,
                        timestamp: new Date()
                    });
                    console.log(`AI ${randomAI.username} boosted post: ${post.title}`);
                }

                await post.save();
            }
        }

        console.log('AI Simulation Complete');
        process.exit(0);

    } catch (error) {
        console.error('AI Seeding Error:', error);
        process.exit(1);
    }
}

seedAI();
