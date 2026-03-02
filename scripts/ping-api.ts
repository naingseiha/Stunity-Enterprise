import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function main() {
    const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

    // Make a valid JWT token
    const token = jwt.sign({
        userId: 'cmiq7z123',
        schoolId: 'cmm7yhssh0000lwcvao23npok',
        role: 'ADMIN'
    }, JWT_SECRET, { expiresIn: '1h' });

    // Call the endpoint
    const url = 'http://localhost:3005/classes/cmiq7zzlk000rq0ja6s7xwhj0/students';
    console.log('Fetching', url);

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const body = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${body}`);
    } catch (err) {
        console.error(err);
    }
}

main();
