import 'dotenv/config';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function run() {
  const keys = await redis.keys('feedranker:*');
  const cacheKeys = await redis.keys('*cache*');
  const feedKeys = await redis.keys('*feed*');
  const allKeys = [...new Set([...keys, ...cacheKeys, ...feedKeys])];
  
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
    console.log(`Cleared ${allKeys.length} feed/cache keys`);
  } else {
    console.log('No keys to clear');
  }
  process.exit(0);
}
run();
