import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const post = await prisma.post.findFirst({
    where: { title: 'Quiz: អង់គ្លេសថ្នាក់ទី១២ - Vocabulary' },
    include: { quiz: true }
  });
  console.log("Quiz from DB:", JSON.stringify(post?.quiz, null, 2));
  process.exit(0);
}
run();
