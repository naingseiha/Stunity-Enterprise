#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '..', 'services');
const TEMPLATE_PATH = path.join(SERVICES_DIR, 'feed-service', 'Dockerfile');

if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('Template Dockerfile not found at:', TEMPLATE_PATH);
    process.exit(1);
}

const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const services = fs.readdirSync(SERVICES_DIR).filter(file => {
    return fs.statSync(path.join(SERVICES_DIR, file)).isDirectory();
});

services.forEach(service => {
    if (service === 'feed-service' || service === '.DS_Store') return;

    const serviceDirPath = path.join(SERVICES_DIR, service);
    const dockerfilePath = path.join(serviceDirPath, 'Dockerfile');

    // Customize template for the specific service
    let content = template.replace(/Feed Service/g, `${service.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`);
    content = content.replace(/auth-service/g, service);
    content = content.replace(/feed-service/g, service);
    content = content.replace(/stunity-feed-service/g, `stunity-${service}`);
    content = content.replace(/feedservice/g, service.replace(/-/g, ''));
    content = content.replace(/npm ci/g, 'npm install');
    content = content.replace(/npx prisma generate/g, 'npx prisma@5.22.0 generate');
    content = content.replace(/PORT=8080/g, `PORT=8080`); // Keep 8080 for Cloud Run

    // Handle port mapping if needed (Cloud Run expects 8080, but app might use different internal port)
    // We'll keep it simple for now and rely on process.env.PORT

    fs.writeFileSync(dockerfilePath, content);
    console.log(`Created Dockerfile for ${service}`);
});
