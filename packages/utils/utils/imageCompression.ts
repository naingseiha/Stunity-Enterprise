/**
 * Image Compression Utility
 * Compresses images before storing in localStorage to avoid quota issues
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.85,
  outputFormat: 'image/jpeg',
};

/**
 * Compresses an image file to reduce size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed image data URL
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.onload = () => {
        try {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          const maxWidth = opts.maxWidth!;
          const maxHeight = opts.maxHeight!;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;

            if (width > height) {
              width = maxWidth;
              height = Math.round(width / aspectRatio);
            } else {
              height = maxHeight;
              width = Math.round(height * aspectRatio);
            }

            // Ensure we don't exceed max height after width calculation
            if (height > maxHeight) {
              height = maxHeight;
              width = Math.round(height * aspectRatio);
            }
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to data URL with compression
          const compressedDataUrl = canvas.toDataURL(
            opts.outputFormat!,
            opts.quality
          );

          resolve(compressedDataUrl);
        } catch (error) {
          reject(new Error('Failed to compress image'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Gets the size of a base64 string in bytes
 * @param base64String - The base64 encoded string
 * @returns Size in bytes
 */
export const getBase64Size = (base64String: string): number => {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const padding =
    base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0;
  return Math.floor((base64Length * 3) / 4) - padding;
};

/**
 * Formats bytes to human readable format
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validates if image size is acceptable for localStorage
 * @param dataUrl - The image data URL
 * @param maxSizeBytes - Maximum allowed size (default: 500KB)
 * @returns Boolean indicating if size is acceptable
 */
export const isImageSizeAcceptable = (
  dataUrl: string,
  maxSizeBytes: number = 500 * 1024
): boolean => {
  return getBase64Size(dataUrl) <= maxSizeBytes;
};
