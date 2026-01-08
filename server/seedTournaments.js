
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Tournament from './models/Tournament.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const tournaments = [
            {
                name: 'Neon Cipher Invitational',
                game: 'CyberStrike 2: Resurgence',
                prize: '$50,000',
                status: 'REGISTRATION',
                startDate: new Date(Date.now() + 86400000),
                maxParticipants: 4
            },
            {
                name: 'Kernel Cup Season 1',
                game: 'Kernel Runner',
                prize: '$10,000',
                status: 'REGISTRATION',
                startDate: new Date(Date.now() + 172800000),
                maxParticipants: 8
            },
            {
                name: 'Binary Bash',
                game: 'Binary Assault',
                prize: '$5,000',
                status: 'REGISTRATION',
                startDate: new Date(Date.now() + 259200000),
                maxParticipants: 16
            }
        ];

        for (const t of tournaments) {
            const existing = await Tournament.findOne({ name: t.name });
            if (!existing) {
                await Tournament.create(t);
                console.log(`Created tournament: ${t.name}`);
            } else {
                console.log(`Tournament already exists: ${t.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failure', err);
        process.exit(1);
    }
}

seed();
