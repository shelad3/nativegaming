
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

        // Insert Media (Clips)
        const MEDIA = [
            {
                userId: createdUsers[0]._id,
                type: 'CLIP',
                title: 'Tactical Wipeout',
                url: 'https://vjs.zencdn.net/v/oceans.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
                game: 'CS2',
                stats: { views: 1200, likes: [createdUsers[1]._id.toString()], gifts: 50 },
                status: 'ready'
            },
            {
                userId: createdUsers[1]._id,
                type: 'CLIP',
                title: 'High Ground Protocol',
                url: 'https://vjs.zencdn.net/v/oceans.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1627850604058-52e40de1b8d7?auto=format&fit=crop&q=80&w=800',
                game: 'Apex Legends',
                stats: { views: 800, likes: [], gifts: 0 },
                status: 'ready'
            }
        ];
        const createdMedia = await Media.insertMany(MEDIA);
        console.log(`Successfully seeded ${createdMedia.length} media items.`);

        // Insert Activities
        const Activity = (await import('./models/Activity.ts')).default;
        const ACTIVITIES = [
            {
                userId: createdUsers[0]._id,
                type: 'POST_CREATED',
                metadata: { targetId: createdPosts[0]._id, targetName: createdPosts[0].title }
            },
            {
                userId: createdUsers[1]._id,
                type: 'MEDIA_CREATED',
                metadata: { targetId: createdMedia[1]._id, targetName: createdMedia[1].title, mediaType: 'clip' }
            },
            {
                userId: createdUsers[2]._id,
                type: 'ACHIEVEMENT_UNLOCKED',
                metadata: { badgeName: 'Early Adopter', badgeType: 'EARLY_ADOPTER' }
            }
        ];
        await Activity.insertMany(ACTIVITIES);
        console.log(`Successfully seeded activities.`);

        console.log('--- SEED OPERATION COMPLETE ---');
    } catch (err) {
        console.error('Seed operation failed:', err);
        throw err;
    }
}

import Media from './models/Media.ts';

// Economy Seeding Data
import MarketItem from './models/MarketItem.ts';
import SubscriptionTier from './models/SubscriptionTier.ts';
import Theme from './models/Theme.ts';

const ITEMS = [
    { name: 'Ghost Protocol Skin', description: 'Advanced stealth aesthetics for your node.', price: 500, rarity: 'Epic', category: 'Cosmetic', type: 'Skin', imageUrl: 'https://picsum.photos/seed/item1/300/300' },
    { name: 'Thermal Sight Override', description: 'Tactical UI enhancement for better target acquisition.', price: 1200, rarity: 'Legendary', category: 'Functional', type: 'Mod', imageUrl: 'https://picsum.photos/seed/item2/300/300' },
    { name: 'Neon Buffer Trace', description: 'Visual trail effect in the broadcast mesh.', price: 200, rarity: 'Rare', category: 'Cosmetic', type: 'Effect', imageUrl: 'https://picsum.photos/seed/item3/300/300' },
    { name: 'CodeBit Multiplier', description: 'Temporary 1.5x gain on strategic interactions.', price: 2500, rarity: 'Epic', category: 'Functional', type: 'Booster', imageUrl: 'https://picsum.photos/seed/item4/300/300' }
];

const TIERS = [
    { name: 'BASIC', price: 0, description: 'Standard operator access with essential mesh features.', features: ['Access to Nexus Feed', 'Tactical Broadcaster View', 'Public Forum Access'], tierLevel: 0 },
    { name: 'ELITE', price: 9.99, description: 'Advanced privileges for serious combatants.', features: ['Custom Node Themes', 'Gift Transmission Capability', 'Priority Matchmaking Signal', 'Elite Clan Access'], tierLevel: 1 },
    { name: 'LEGEND', price: 24.99, description: 'The ultimate protocol for sovereign battlefield nodes.', features: ['Certified Operator Badge', 'Zero-Fee Marketplace Access', 'Real-time Matrix Profiles', 'Beta Protocol Previews', '1000 Monthly CodeBits'], tierLevel: 2 }
];

const THEMES = [
    {
        name: 'Midnight Nebula',
        type: 'banner',
        price: 400,
        description: 'Deep space gradient banner with subtle nebula motion feel.',
        previewUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&q=80&w=300&h=200',
        assets: {
            bannerUrl: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&q=80&w=1600',
            colors: { primary: '#5865F2', secondary: '#0b1020', accent: '#99AAB5' }
        },
        rarity: 'Common'
    },
    {
        name: 'Neon Grid',
        type: 'banner',
        price: 500,
        description: 'Retro-futuristic tactical grid background with high-energy pink accents.',
        previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b25272a7?auto=format&fit=crop&q=80&w=300&h=200',
        assets: {
            bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b25272a7?auto=format&fit=crop&q=80&w=1600',
            colors: { primary: '#ff00ff', secondary: '#050005', accent: '#ff00aa' }
        },
        rarity: 'Common'
    },
    {
        name: 'Glass Pulse',
        type: 'animation',
        price: 1200,
        description: 'A clean glass-panel pulse on UI highlights and cards.',
        previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=glasspulse',
        assets: {
            animationClass: 'discord-pulse'
        },
        rarity: 'Rare'
    },
    {
        name: 'Matrix Overlay',
        type: 'profile',
        price: 900,
        description: 'Digital matrix overlay profile effect (subtle grid + green tint).',
        previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=matrix',
        assets: {
            profileEffect: 'matrix'
        },
        rarity: 'Rare'
    },
    {
        name: 'Inter UI Font',
        type: 'font',
        price: 600,
        description: 'Clean modern UI font used in many Discord-like layouts.',
        previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=inter',
        assets: {
            fontFamily: 'Inter',
            fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
        },
        rarity: 'Common'
    },
    {
        name: 'JetBrains Mono',
        type: 'font',
        price: 800,
        description: 'Monospace operator font for code-heavy interfaces.',
        previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=jbmono',
        assets: {
            fontFamily: 'JetBrains Mono',
            fontUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap'
        },
        rarity: 'Rare'
    },
    {
        name: 'Glass Bloom',
        type: 'effect',
        price: 1400,
        description: 'Adds a soft bloom/glow around primary elements and cards.',
        previewUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=bloom',
        assets: {
            customCSS: "[data-theme=dark] .glass-card{box-shadow:0 0 60px rgba(88,101,242,.08);} .text-glow{text-shadow:0 0 24px var(--glow-primary);}"
        },
        rarity: 'Epic'
    },
    {
        name: 'Shadow Nexus',
        type: 'bundle',
        price: 3200,
        description: 'Full stealth kit: banner + colors + pulse + matrix + font.',
        previewUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=300&h=200',
        assets: {
            bannerUrl: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bcc0?auto=format&fit=crop&q=80&w=1600',
            animationClass: 'discord-pulse',
            profileEffect: 'matrix',
            fontFamily: 'Inter',
            fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
            colors: { primary: '#10b981', secondary: '#064e3b', accent: '#34d399' }
        },
        rarity: 'Legendary'
    },
    {
        name: 'Solar Flare',
        type: 'bundle',
        price: 2600,
        description: 'Intense amber aesthetics for high-rank operators.',
        previewUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=300&h=200',
        assets: {
            bannerUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1600',
            fontFamily: 'Inter',
            fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
            colors: { primary: '#f59e0b', secondary: '#451a03', accent: '#fbbf24' }
        },
        rarity: 'Epic'
    }
];

import ForumCategory from './models/ForumCategory.ts';

const CATEGORIES = [
    { name: 'Announcements', description: 'Official updates from the NativeCodeX high command.', icon: 'Megaphone', color: '#3b82f6', isAdminOnly: true, order: 1 },
    { name: 'General Discussion', description: 'The hub for all things gaming, tech, and beyond.', icon: 'MessageSquare', color: '#10b981', order: 2 },
    { name: 'Strategy & Tips', description: 'Master the arena. Share your most lethal tactics.', icon: 'Zap', color: '#f59e0b', order: 3 },
    { name: 'Looking for Group (LFG)', description: 'Recruit teammates for your next mission.', icon: 'Users', color: '#8b5cf6', order: 4 },
    { name: 'Support & Bug Reports', description: 'Technical assistance and system anomalies.', icon: 'LifeBuoy', color: '#ef4444', order: 5 }
];

async function seedEconomy() {
    console.log('--- STARTING ECONOMY SEEDING ---');
    try {
        await mongoose.connect(MONGODB_URI);

        for (const item of ITEMS) {
            await MarketItem.findOneAndUpdate({ name: item.name }, item, { upsert: true });
        }
        for (const tier of TIERS) {
            await SubscriptionTier.findOneAndUpdate({ name: tier.name }, tier, { upsert: true });
        }
        for (const theme of THEMES) {
            await Theme.findOneAndUpdate({ name: theme.name }, theme, { upsert: true });
        }
        for (const cat of CATEGORIES) {
            await ForumCategory.findOneAndUpdate({ name: cat.name }, cat, { upsert: true });
        }

        console.log('Economy and Forum data seeded successfully.');
    } catch (err) {
        console.error('Economy seed failed:', err);
    }
}

// Run both
(async () => {
    try {
        await seed();
        await seedEconomy();
        console.log('✅ All synchronization operations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Synchronization failed:', err);
        process.exit(1);
    }
})();
