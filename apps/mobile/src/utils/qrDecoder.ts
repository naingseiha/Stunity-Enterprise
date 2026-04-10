import * as FileSystem from 'expo-file-system';
import jsQR from 'jsqr';
// @ts-ignore - pure JS lib without types
import * as jpeg from 'jpeg-js';
// @ts-ignore - pure JS lib without types
import UPNG from 'upng-js';
import { toByteArray as decodeBase64 } from 'base64-js';

/**
 * Pure JavaScript QR Decoder for Expo
 * 100% Pure JS - works in Expo Go and Custom Dev Builds without any extra native modules.
 */
export async function decodeQRFromImage(uri: string): Promise<string | null> {
  try {
    // 1. Read file as base64 using a module the user already has (FileSystem)
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) return null;

    // 2. Convert base64 to binary bytes
    const binaryData = decodeBase64(base64);

    let pixels: Uint8ClampedArray;
    let width: number;
    let height: number;

    // 3. Detect format and decode
    // Most screenshots are PNG, most photos are JPEG.
    const isPng = uri.toLowerCase().endsWith('.png');

    if (isPng) {
      const img = UPNG.decode(binaryData.buffer);
      const rgba = UPNG.toRGBA8(img)[0];
      pixels = new Uint8ClampedArray(rgba);
      width = img.width;
      height = img.height;
    } else {
      // Decode JPEG using pure JS
      // Warning: Large images (>5MP) will be slow on the JS thread.
      const img = jpeg.decode(binaryData, { useTArray: true, formatAsRGBA: true });
      pixels = new Uint8ClampedArray(img.data);
      width = img.width;
      height = img.height;
    }

    // 4. Pass pixels to jsQR
    const code = jsQR(pixels, width, height);

    return code ? code.data : null;
  } catch (error) {
    console.error('[QRDecoder] Pure-JS decoding failed:', error);
    return null;
  }
}
