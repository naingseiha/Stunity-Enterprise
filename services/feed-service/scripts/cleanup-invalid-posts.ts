/**
 * Clean up posts with invalid file:// URIs
 * 
 * This script removes posts that have local file URIs which cannot be accessed.
 * Only keeps posts with valid http/https URLs or no media.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function cleanupInvalidPosts() {
  console.log('🧹 Starting cleanup of posts with invalid file:// URIs...\n');

  try {
    // Find all posts
    const allPosts = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        createdAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total posts in database: ${allPosts.length}\n`);

    // Identify posts with file:// URIs
    const invalidPosts = allPosts.filter(post => {
      if (!post.mediaUrls || post.mediaUrls.length === 0) {
        return false; // Posts without media are fine
      }
      
      return post.mediaUrls.some((url: any) => {
        if (typeof url === 'string') {
          return url.startsWith('file://');
        }
        return false;
      });
    });

    console.log(`❌ Found ${invalidPosts.length} posts with invalid file:// URIs:\n`);

    if (invalidPosts.length === 0) {
      console.log('✅ No invalid posts found! Database is clean.');
      return;
    }

    // Display invalid posts
    invalidPosts.forEach((post, index) => {
      const author = `${post.author.firstName} ${post.author.lastName}`;
      const preview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
      const mediaCount = Array.isArray(post.mediaUrls) ? post.mediaUrls.length : 0;
      
      console.log(`${index + 1}. ID: ${post.id}`);
      console.log(`   Author: ${author}`);
      console.log(`   Content: "${preview}"`);
      console.log(`   Media: ${mediaCount} file(s) with file:// URIs`);
      console.log(`   Created: ${post.createdAt.toISOString()}`);
      console.log('');
    });

    // Confirm deletion
    console.log(`\n⚠️  About to DELETE ${invalidPosts.length} posts with invalid URIs...\n`);
    
    // Delete invalid posts
    const postIds = invalidPosts.map(p => p.id);
    
    // First, delete related records
    console.log('🗑️  Deleting related records (likes, comments, etc.)...');
    
    await prisma.like.deleteMany({
      where: { postId: { in: postIds } },
    });
    
    await prisma.comment.deleteMany({
      where: { postId: { in: postIds } },
    });
    
    await prisma.bookmark.deleteMany({
      where: { postId: { in: postIds } },
    });
    
    // Delete the posts themselves
    console.log('🗑️  Deleting posts...');
    const result = await prisma.post.deleteMany({
      where: {
        id: { in: postIds },
      },
    });

    console.log(`\n✅ Successfully deleted ${result.count} posts with invalid URIs!`);

    // Show remaining valid posts
    const remainingPosts = await prisma.post.count();
    console.log(`\n📊 Remaining posts in database: ${remainingPosts}`);

    // Show some valid posts as examples
    const validPosts = await prisma.post.findMany({
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    if (validPosts.length > 0) {
      console.log(`\n✅ Sample of remaining valid posts:\n`);
      validPosts.forEach((post, index) => {
        const author = `${post.author.firstName} ${post.author.lastName}`;
        const preview = post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '');
        const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
        
        console.log(`${index + 1}. "${preview}" by ${author}`);
        if (mediaUrls.length > 0) {
          console.log(`   Media: ${mediaUrls.length} file(s)`);
          mediaUrls.forEach((url: any, i: number) => {
            const urlPreview = typeof url === 'string' ? url.substring(0, 60) + '...' : 'invalid';
            console.log(`     ${i + 1}. ${urlPreview}`);
          });
        } else {
          console.log(`   Media: None`);
        }
        console.log('');
      });
    }

    console.log('\n🎉 Cleanup complete! Database is now clean.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupInvalidPosts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
