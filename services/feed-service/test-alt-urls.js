const { PrismaClient } = require('@prisma/client');
async function test() {
    const urlsToTest = [
        "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
        "postgresql://postgres.mwqdsxbxqlkrahoyqqox:Iamaprogrammer2131@mwqdsxbxqlkrahoyqqox.pooler.supabase.com:6543/postgres?pgbouncer=true",
        "postgresql://postgres:Iamaprogrammer2131@mwqdsxbxqlkrahoyqqox.pooler.supabase.com:6543/postgres?pgbouncer=true",
        "postgresql://postgres:Iamaprogrammer2131@mwqdsxbxqlkrahoyqqox.pooler.supabase.com:5432/postgres",
    ];

    for (const url of urlsToTest) {
        console.log(`\nTesting URL: ${url}`);
        const prisma = new PrismaClient({ datasources: { db: { url } } });
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log(`✅ SUCCESS with URL: ${url}`);
        } catch (e) {
            console.log(`❌ FAILED. Error: ${e.message.split('\n')[0]} - ${e.message.includes('Tenant') ? 'Tenant/User not found' : e.message.includes('reach database') || e.message.includes('getaddrinfo') ? 'Unreachable/DNS' : e.message.includes('password') ? 'Bad Password' : 'Other'}`);
        } finally {
            await prisma.$disconnect();
        }
    }
}
test();
