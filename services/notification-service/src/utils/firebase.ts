
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import dotenv from 'dotenv';

dotenv.config();

if (getApps().length === 0) {
    try {
        initializeApp({
            credential: applicationDefault(),
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}

export const messaging = getMessaging();
