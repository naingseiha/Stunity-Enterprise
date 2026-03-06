import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

// Phase 1 Day 6: Optional Sharp import for image optimization
// Gracefully degrades if Sharp is not available (development mode)
let sharp: any;
let encodeBlurHash: any;
try {
  sharp = require('sharp');
  const blurhash = require('blurhash');
  encodeBlurHash = blurhash.encode;
  console.log('✅ Sharp image optimization enabled');
} catch (error) {
  console.warn('⚠️  Sharp not available - image optimization disabled (OK for development)');
  sharp = null;
  encodeBlurHash = null;
}

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'stunityapp';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Phase 1 Day 6: Image optimization constants
const MAX_IMAGE_WIDTH = 2048;  // Max width for feed images
const MAX_IMAGE_HEIGHT = 2048; // Max height for feed images
const WEBP_QUALITY = 85;       // WebP quality (70-90 recommended)
const JPEG_QUALITY = 90;       // JPEG fallback quality
const ONE_YEAR_SECONDS = 31536000; // 1 year cache TTL

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

// Phase 1 Day 6: Generate BlurHash for image placeholder
const generateBlurHash = async (imageBuffer: Buffer): Promise<string> => {
  if (!sharp || !encodeBlurHash) {
    return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'; // Default blurhash (gray)
  }

  try {
    const image = sharp(imageBuffer);
    const { data, info } = await image
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    const blurHash = encodeBlurHash(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      3  // componentY
    );

    return blurHash;
  } catch (error) {
    console.error('⚠️ BlurHash generation failed:', error);
    return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'; // Default blurhash (gray)
  }
};

// Phase 1 Day 6: Process and optimize image before upload
const processImage = async (
  fileBuffer: Buffer,
  originalName: string
): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number; blurHash: string }> => {
  // If Sharp is not available, return original image
  if (!sharp) {
    console.warn('⚠️  Image optimization skipped (Sharp not available)');
    return {
      buffer: fileBuffer,
      mimeType: 'image/jpeg',
      width: 0,
      height: 0,
      blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', // Default gray blurhash
    };
  }

  try {
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    // Check dimensions
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width === 0 || height === 0) {
      throw new Error('Invalid image dimensions');
    }

    // Validate max dimensions
    if (width > MAX_IMAGE_WIDTH * 2 || height > MAX_IMAGE_HEIGHT * 2) {
      throw new Error(`Image too large: ${width}x${height}. Maximum: ${MAX_IMAGE_WIDTH * 2}x${MAX_IMAGE_HEIGHT * 2}`);
    }

    // Generate blurhash before resizing
    const blurHash = await generateBlurHash(fileBuffer);

    // Resize if needed (maintain aspect ratio)
    let processedImage = image;
    if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
      processedImage = image.resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for 70% size reduction
    // Phase 1 optimization: WebP provides better compression than JPEG/PNG
    const optimizedBuffer = await processedImage
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const finalMetadata = await sharp(optimizedBuffer).metadata();

    console.log(`🖼️  Image optimized: ${originalName}`);
    console.log(`   Original: ${(fileBuffer.length / 1024).toFixed(1)}KB (${width}x${height})`);
    console.log(`   Optimized: ${(optimizedBuffer.length / 1024).toFixed(1)}KB (${finalMetadata.width}x${finalMetadata.height}) WebP`);
    console.log(`   Reduction: ${((1 - optimizedBuffer.length / fileBuffer.length) * 100).toFixed(1)}%`);
    console.log(`   BlurHash: ${blurHash}`);

    return {
      buffer: optimizedBuffer,
      mimeType: 'image/webp',
      width: finalMetadata.width || width,
      height: finalMetadata.height || height,
      blurHash,
    };
  } catch (error: any) {
    console.error('⚠️ Image processing failed, using original:', error.message);
    // Fallback: return original without metadata since it failed parsing
    return {
      buffer: fileBuffer,
      mimeType: 'application/octet-stream', // Avoid claiming it's a valid JPEG if parsing failed
      width: 0,
      height: 0,
      blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    };
  }
};

// Upload file to R2 with Phase 1 Day 6 optimizations
export const uploadToR2 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'posts'
): Promise<{ url: string; key: string; width?: number; height?: number; blurHash?: string }> => {
  // Phase 1 Day 6: Process images (WebP conversion, resize, blurhash)
  let finalBuffer = fileBuffer;
  let finalMimeType = mimeType;
  let imageMetadata: { width?: number; height?: number; blurHash?: string } = {};

  if (mimeType.startsWith('image/')) {
    // Verify magic bytes so Android `.mp4` videos disguised as `.jpg` don't instantly crash libvips.
    const isJpeg = fileBuffer.length > 2 && fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8;
    const isPng = fileBuffer.length > 4 && fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47;
    const isGif = fileBuffer.length > 3 && fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46;
    const isWebp = fileBuffer.length > 12 && fileBuffer.slice(8, 12).toString('ascii') === 'WEBP';

    if (isJpeg || isPng || isGif || isWebp) {
      const processed = await processImage(fileBuffer, originalName);
      finalBuffer = processed.buffer;
      finalMimeType = processed.mimeType;
      imageMetadata = {
        width: processed.width,
        height: processed.height,
        blurHash: processed.blurHash,
      };

      if (finalMimeType === 'image/webp') {
        const ext = path.extname(originalName);
        originalName = ext ? originalName.replace(ext, '.webp') : `${originalName}.webp`;
      }
    } else {
      console.warn(`⚠️ Android compatibility: File ${originalName} was uploaded as image but failed magic byte check. Treating as video/mp4 format.`);
      finalMimeType = 'video/mp4';
      const ext = path.extname(originalName);
      originalName = ext ? originalName.replace(ext, '.mp4') : `${originalName}.mp4`;
    }
  }

  const key = generateFileName(originalName, folder);

  // Phase 1 Day 6: Add aggressive cache headers (1 year TTL)
  // Images are immutable (unique filenames), so cache forever
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: finalBuffer,
    ContentType: finalMimeType,
    CacheControl: `public, max-age=${ONE_YEAR_SECONDS}, immutable`, // 1 year cache
    Metadata: {
      originalName: originalName,
      uploadedAt: new Date().toISOString(),
      ...(imageMetadata.width && { width: imageMetadata.width.toString() }),
      ...(imageMetadata.height && { height: imageMetadata.height.toString() }),
      ...(imageMetadata.blurHash && { blurHash: imageMetadata.blurHash }),
    },
  });

  await s3Client.send(command);

  // Return the public URL with metadata
  const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;

  return { url, key, ...imageMetadata };
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
): Promise<Array<{ url: string; key: string; width?: number; height?: number; blurHash?: string }>> => {
  const results = await Promise.all(
    files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype, folder))
  );
  return results;
};

// Generate a Presigned URL for Direct Client Uploads
export const generatePresignedUploadUrl = async (
  originalName: string,
  contentType: string,
  folder: string = 'posts'
): Promise<{ presignedUrl: string; key: string; publicUrl: string; expiresAt: string }> => {
  const key = generateFileName(originalName, folder);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: `public, max-age=${ONE_YEAR_SECONDS}, immutable`,
  });

  // URL expires in 15 minutes (900 seconds)
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
  const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

  console.log(`🎟️  Generated Presigned URL for: ${key} (${contentType})`);

  return { presignedUrl, key, publicUrl, expiresAt };
};

export default {
  isR2Configured,
  uploadToR2,
  deleteFromR2,
  uploadMultipleToR2,
  generatePresignedUploadUrl,
};
