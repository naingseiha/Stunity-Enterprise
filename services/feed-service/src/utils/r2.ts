import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stunityapp';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Check if R2 is configured
export const isR2Configured = (): boolean => {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
};

// Generate unique filename
const generateFileName = (originalName: string, prefix: string = 'feed'): string => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}/${timestamp}-${random}${ext}`;
};

// Upload file to R2
export const uploadToR2 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'posts'
): Promise<{ url: string; key: string }> => {
  const key = generateFileName(originalName, folder);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return the public URL
  const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
  
  return { url, key };
};

// Delete file from R2
export const deleteFromR2 = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
};

// Upload multiple files
export const uploadMultipleToR2 = async (
  files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
  folder: string = 'posts'
): Promise<Array<{ url: string; key: string }>> => {
  const results = await Promise.all(
    files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
  );
  return results;
};

export default {
  isR2Configured,
  uploadToR2,
  deleteFromR2,
  uploadMultipleToR2,
};
