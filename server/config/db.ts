import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nativecodex';

        const conn = await mongoose.connect(MONGODB_URI);

        console.log(`[DATABASE] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[DATABASE] Connection Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

export default connectDB;
