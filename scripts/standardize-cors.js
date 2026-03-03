#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '..', 'services');

const services = fs.readdirSync(SERVICES_DIR).filter(file => {
    return fs.statSync(path.join(SERVICES_DIR, file)).isDirectory();
});

services.forEach(service => {
    const indexPath = path.join(SERVICES_DIR, service, 'src', 'index.ts');
    if (!fs.existsSync(indexPath)) return;

    let content = fs.readFileSync(indexPath, 'utf8');

    // Regex to match app.use(cors({ ... })) 
    // We want to replace the origin array with a dynamic check
    const corsRegex = /app\.use\(cors\(\{\s+origin: \[[^\]]+\]/g;

    const replacement = `const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];\n\napp.use(cors({\n  origin: (origin, callback) => {\n    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {\n      callback(null, true);\n    } else {\n      callback(new Error('Not allowed by CORS'));\n    }\n  }`;

    if (corsRegex.test(content)) {
        content = content.replace(corsRegex, replacement);
        fs.writeFileSync(indexPath, content);
        console.log(`Updated CORS in ${service}`);
    } else if (content.includes('app.use(cors())')) {
        // Handle simple app.use(cors())
        const simpleCorsRegex = /app\.use\(cors\(\)\);/g;
        content = content.replace(simpleCorsRegex, replacement + ');');
        fs.writeFileSync(indexPath, content);
        console.log(`Updated simple CORS in ${service}`);
    }
});
