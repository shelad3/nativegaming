
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Post from '../models/Post';
import Clan from '../models/Clan';
import { faker } from '@faker-js/faker';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

const NUM_USERS = 20;
const NUM_CLANS = 5;

// Helper to get random date within last 7 days
function getRandomRecentDate() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing data (optional, but safer for cleaner seeds)
        // await User.deleteMany({});
        // await Post.deleteMany({});
        // await Clan.deleteMany({});

        // 1. Create Clans
        const clanDocs = [];
        for (let i = 0; i < NUM_CLANS; i++) {
            const clanName = faker.company.name().slice(0, 15) + " Clan";
            const tag = faker.string.alpha(3).toUpperCase();

            // Check if exists to avoid error
            const exists = await Clan.findOne({ tag });
            if (!exists) {
                // Temporary leader placeholder, will fix later
                const clan = await Clan.create({
                    name: clanName,
                    tag: tag,
                    description: faker.company.catchPhrase(),
                    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${tag}`,
                    createdBy: new mongoose.Types.ObjectId().toString(), // Temp
                    members: []
                });
                clanDocs.push(clan);
                console.log(`Created Clan: ${clanName} [${tag}]`);
            }
        }

        const createdUsers = [];

        // 2. Create Users
        for (let i = 0; i < NUM_USERS; i++) {
            const username = faker.internet.username();

            // Assign to random clan
            let clanData = {};
            if (clanDocs.length > 0 && Math.random() > 0.3) { // 70% chance to be in clan
                const randomClan = clanDocs[Math.floor(Math.random() * clanDocs.length)];
                clanData = {
                    clanId: randomClan._id.toString(),
                    clanRole: 'member',
                    clanJoinedAt: new Date()
                };

                // Add to clan members list
                randomClan.members.push({
                    userId: 'TEMP', // Will update with actual ID after creation
                    role: 'member',
                    joinedAt: new Date()
                });
            }

            const user = await User.create({
                username: username,
                email: faker.internet.email(),
                password: '$2a$10$YourHashedPasswordHere',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                tier: Math.random() > 0.8 ? 'PREMIUM' : 'FREE',
                codeBits: Math.floor(Math.random() * 5000),
                bio: faker.lorem.sentence(),
                hasCompletedOnboarding: true,
                stats: {
                    rating: Math.floor(Math.random() * 2000),
                    winRate: `${Math.floor(Math.random() * 100)}%`,
                    trophies: Math.floor(Math.random() * 50),
                    tournaments: Math.floor(Math.random() * 10)
                },
                ...clanData
            });

            // Update clan member ID if joined
            if (user.clanId) {
                const clan = clanDocs.find(c => c._id.toString() === user.clanId);
                if (clan) {
                    // Update the last added member (which was us)
                    const mem = clan.members[clan.members.length - 1];
                    if (mem.userId === 'TEMP') {
                        mem.userId = user._id.toString();
                        await clan.save();
                    }

                    // If clan has no leader, make this user leader
                    if (!clan.members.some(m => m.role === 'leader')) {
                        const memberIdx = clan.members.findIndex(m => m.userId === user._id.toString());
                        if (memberIdx !== -1) {
                            clan.members[memberIdx].role = 'leader';
                            clan.createdBy = user._id.toString(); // Update creator
                            await clan.save();

                            user.clanRole = 'leader';
                            await user.save();
                        }
                    }
                }
            }

            createdUsers.push(user);
            console.log(`Created user: ${user.username}`);
        }

        // 3. Create Posts (Instagram Feed Logic)
        // Create a large pool of posts with random timestamps
        for (const user of createdUsers) {
            const numPosts = 5 + Math.floor(Math.random() * 5); // 5 to 10 posts

            for (let j = 0; j < numPosts; j++) {
                const post = await Post.create({
                    title: faker.hacker.phrase(),
                    content: faker.lorem.paragraph(),
                    authorId: user._id,
                    authorName: user.username,
                    authorAvatar: user.avatar,
                    likes: [],
                    views: Math.floor(Math.random() * 1000),
                    gifts: [],
                    createdAt: getRandomRecentDate(), // Randomize time for feed mix
                    isSubscriberOnly: Math.random() > 0.9
                });

                // Add random likes
                const numLikes = Math.floor(Math.random() * 15);
                for (let k = 0; k < numLikes; k++) {
                    const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                    if (randomUser && !post.likes.includes(randomUser.id)) {
                        post.likes.push(randomUser.id);
                    }
                }
                await post.save();
            }

            // Follow random users
            const numFollows = Math.floor(Math.random() * 5);
            for (let f = 0; f < numFollows; f++) {
                const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                if (randomUser && randomUser._id.toString() !== user._id.toString() && !user.following.includes(randomUser.id)) {
                    user.following.push(randomUser.id);
                    randomUser.followers.push(user.id);
                    await randomUser.save();
                }
            }
            await user.save();
        }

        console.log('User & Clan Seeding Complete');
        process.exit(0);

    } catch (error) {
        console.error('Seeding Error:', error);
        process.exit(1);
    }
}

seedUsers();
