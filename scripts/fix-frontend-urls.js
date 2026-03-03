const fs = require('fs');
const path = require('path');

const WEB_SRC_DIR = path.join(__dirname, '..', 'apps', 'web', 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const replacements = [
    { pattern: /'http:\/\/localhost:3001'/g, env: 'process.env.NEXT_PUBLIC_AUTH_SERVICE_URL' },
    { pattern: /"http:\/\/localhost:3001"/g, env: 'process.env.NEXT_PUBLIC_AUTH_SERVICE_URL' },
    { pattern: /`http:\/\/localhost:3001`/g, env: 'process.env.NEXT_PUBLIC_AUTH_SERVICE_URL' },

    { pattern: /'http:\/\/localhost:3010'/g, env: 'process.env.NEXT_PUBLIC_FEED_SERVICE_URL' },
    { pattern: /"http:\/\/localhost:3010"/g, env: 'process.env.NEXT_PUBLIC_FEED_SERVICE_URL' },
    { pattern: /`http:\/\/localhost:3010`/g, env: 'process.env.NEXT_PUBLIC_FEED_SERVICE_URL' },

    { pattern: /'http:\/\/localhost:3002'/g, env: 'process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL' },
    { pattern: /"http:\/\/localhost:3002"/g, env: 'process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL' },
    { pattern: /`http:\/\/localhost:3002`/g, env: 'process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL' },
];

walkDir(WEB_SRC_DIR, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ pattern, env }) => {
        if (content.match(pattern)) {
            content = content.replace(pattern, env);
            modified = true;
        }
    });

    if (modified) {
        console.log(`✅ Fixed hardcoded URLs in ${path.relative(WEB_SRC_DIR, filePath)}`);
        fs.writeFileSync(filePath, content);
    }
});
