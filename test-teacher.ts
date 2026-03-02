import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({
    where: { name: 'Svaythom High School' }
  });

  if (!school) {
    console.log("No school found!");
    return;
  }
  
  // Login to get token
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@svaythom.edu.kh', password: 'SvaythomAdmin2026!' })
  });
  
  const loginData = await loginRes.json() as any;
  if (!loginData.success) {
    console.log("Login failed", loginData);
    return;
  }
  
  const token = loginData.data.tokens.accessToken;
  console.log("Got token");

  // Fetch academic year
  const ay = await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true }
  })
  
  console.log("Current Academic Year:", ay?.id)

  let url = 'http://localhost:3004/teachers/lightweight';
  if(ay) {
      url += `?academicYearId=${ay.id}`
  }

  // Fetch teachers
  const tRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const tData = await tRes.json() as any;
  console.log("Teacher Status:", tRes.status);
  console.log("Total Teachers Returned:", tData?.data?.length);

}
main();
