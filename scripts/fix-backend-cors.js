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

    // Pattern to find the existing CORS origin logic
    const corsPattern = /origin:\s*\((origin|arg1),\s*(callback|arg2)\)\s*=>\s*\{[\s\S]*?\},/g;

    const replacement = `origin: (origin, callback) => {
    // Allow all origins in production if CORS_ORIGIN is set to *
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(\`CORS: origin \${origin} not allowed\`));
  },`;

    if (content.match(corsPattern)) {
        content = content.replace(corsPattern, replacement);
        console.log(`✅ Patching individual CORS logic in ${service}`);
    } else {
        // Fallback: check if it uses a simple origin: allowedOrigins
        const simpleCorsPattern = /origin:\s*allowedOrigins,/g;
        if (content.match(simpleCorsPattern)) {
            content = content.replace(simpleCorsPattern, replacement);
            console.log(`✅ Patching simple CORS logic in ${service}`);
        }
    }

    fs.writeFileSync(indexPath, content);
});
