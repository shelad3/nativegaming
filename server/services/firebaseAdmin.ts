import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const initializeFirebaseAdmin = () => {
    try {
        if (admin.apps.length > 0) return admin.app();

        // Check for service account environment variable or file
        const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccountVar) {
            try {
                const serviceAccount = JSON.parse(serviceAccountVar);
                return admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
                });
            } catch (e) {
                console.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON:', e);
            }
        }

        // Fallback or development mock
        console.warn('⚠️  Firebase Admin initialized without credentials. Some features may not work.');
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(), // This might fail if no default creds exist
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    } catch (error) {
        console.error('❌ Firebase Admin initialization failed:', error);
        return null;
    }
};

const adminApp = initializeFirebaseAdmin();

export const verifyIdToken = async (token: string) => {
    if (!adminApp) return null;
    try {
        return await admin.auth().verifyIdToken(token);
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
};

export { admin };
export default adminApp;
