
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.ts';
import Post from './models/Post.ts';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

const USERS = [
    {
        username: 'SHELDON_PRIME',
        email: 'sheldonramu8@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sheldon',
        tier: 'LEGEND',
        codeBits: 1000000,
        bio: 'Architect of the Nexus. Root access granted.',
        isVerified: true,
        premiumSettings: {
            customColors: {
                primary: '#3b82f6',
                secondary: '#1d4ed8',
                accent: '#60a5fa'
            },
            isVerified: true,
            customAnimation: 'discord-pulse',
            profileEffect: 'matrix'
        },
        hasCompletedOnboarding: true
    },
    {
        username: 'Neo_Bane',
        email: 'neo@nativecodex.io',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neo',
        tier: 'ELITE',
        codeBits: 50000,
        bio: 'Glaring at the code until it compiles.',
        hasCompletedOnboarding: true
    },
    {
        username: 'Queen_Code',
        email: 'queen@nativecodex.io',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Queen',
        tier: 'PREMIUM',
        codeBits: 25000,
        bio: 'Commanding the mesh since 2023.',
        hasCompletedOnboarding: true
    },
    {
        username: 'Ghost_Shell',
        email: 'ghost@nativecodex.io',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ghost',
        tier: 'FREE',
        codeBits: 1000,
        bio: 'Just passing through the bits.',
        hasCompletedOnboarding: true
    },
    {
        username: 'Data_Lord',
        email: 'data@nativecodex.io',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Data',
        tier: 'ELITE',
        codeBits: 75000,
        bio: 'Entropy is my middle name.',
        hasCompletedOnboarding: true
    }
];

const POSTS = [
    {
        title: 'Decrypting the Void',
        content: 'The mesh is speaking to me in hex code again.',
        authorName: 'SHELDON_PRIME',
        thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800',
        views: 15400,
        likes: [],
        gifts: []
    },
    {
        title: 'Neon Nights in Tokyo',
        content: 'Cyberpunk aesthetics are real if you look hard enough.',
        authorName: 'Neo_Bane',
        thumbnail: 'https://images.unsplash.com/photo-1514565131-0ce0b144cafc?auto=format&fit=crop&q=80&w=800',
        views: 8900,
        likes: [],
        gifts: []
    }
];

async function seed() {
    try {
        console.log('--- STARTING SEED OPERATION ---');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Clear existing data
        await User.deleteMany({});
        await Post.deleteMany({});
        console.log('Cleared existing User and Post collections.');

        // Insert Users
        const createdUsers = await User.insertMany(USERS.map(u => ({
            ...u,
            stats: { rating: 1200 + Math.floor(Math.random() * 800), winRate: '65%', trophies: Math.floor(Math.random() * 100), tournaments: Math.floor(Math.random() * 10) },
            settings: { isPublic: true, allowMessages: 'all', notifications: { emails: true, push: true, mentions: true }, theme: 'dark' }
        })));
        console.log(`Successfully seeded ${createdUsers.length} users.`);

        // Map usernames to IDs for posts
        const userMap = new Map(createdUsers.map(u => [u.username, u]));

        // Insert Posts
        const postsWithIds = POSTS.map(p => {
            const author = userMap.get(p.authorName);
            return {
                ...p,
                authorId: author?._id,
                authorAvatar: author?.avatar,
                timestamp: new Date().toISOString()
            };
        });

        const createdPosts = await Post.insertMany(postsWithIds);
        console.log(`Successfully seeded ${createdPosts.length} posts.`);

        console.log('--- SEED OPERATION COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Seed operation failed:', err);
        process.exit(1);
    }
}

seed();
