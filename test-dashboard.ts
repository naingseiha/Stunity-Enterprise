import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function main() {
  const superAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@stunity.com' }
  });

  if (!superAdmin) {
    console.log("No super admin found!");
    return;
  }
  
  // Login to get token
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@stunity.com', password: 'StunityAdmin2026!' })
  });
  
  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.log("Login failed", loginData);
    return;
  }
  
  const token = loginData.data.tokens.accessToken;
  console.log("Got token");

  // Fetch dashboard stats
  const dashRes = await fetch('http://localhost:3002/super-admin/dashboard/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const dashData = await dashRes.json();
  console.log("Dashboard Status:", dashRes.status);
  console.log("Dashboard Response:", JSON.stringify(dashData, null, 2));

}
main();
