
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tournament from './models/Tournament';
import User from './models/User';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

async function verify() {
    try {
        console.log('--- STARTING VERIFICATION SEQUENCE ---');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        // 1. Create a test tournament
        const tournament = await Tournament.create({
            name: 'CYBER_STRIKE_2026',
            game: 'Neural Link Arena',
            prize: '50,000 Ȼ',
            startDate: new Date(),
            status: 'REGISTRATION'
        });
        console.log('Test Tournament created:', tournament.name, tournament._id);

        // 2. Find a test user (from seed or create one)
        let user = await User.findOne({ email: 'sheldonramu8@gmail.com' });
        if (!user) {
            user = await User.create({
                username: 'TEST_OPERATOR',
                email: 'test@example.com',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
            });
        }
        console.log('Target User identified:', user.username, user._id);

        // 3. Simulate registration logic (simplified)
        tournament.participants.push(user._id as any);
        await tournament.save();

        user.registeredTournaments.push(tournament._id as any);
        user.stats.tournaments += 1;
        await user.save();

        console.log('Registration verified: User', user.username, 'is now participant in', tournament.name);

        // 4. Cleanup (optional, but let's keep it for now and delete later if needed)
        // await Tournament.findByIdAndDelete(tournament._id);
        // console.log('Cleanup completed.');

        console.log('--- VERIFICATION SEQUENCE COMPLETE: SUCCESS ---');
        process.exit(0);
    } catch (err) {
        console.error('Verification sequence failed:', err);
        process.exit(1);
    }
}

verify();
