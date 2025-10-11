const MAX_FILE_SIZE = 1.5 * 1024 * 1024; // 1.5MB in bytes

export interface CompressionResult {
  uri: string;
  compressed: boolean;
  originalSize?: number;
  compressedSize?: number;
}

/**
 * Check if base64 image is larger than 1.5MB and return appropriate quality
 * @param base64Data - The base64 string of the image
 * @returns { shouldCompress: boolean, quality: number }
 */
export function shouldCompressBase64(base64Data: string): { shouldCompress: boolean; quality: number } {
  // Calculate base64 size (approximately 4/3 of the actual file size)
  const base64Size = (base64Data.length * 3) / 4;
  console.log(`ImageCompression: Base64 size: ${(base64Size / 1024 / 1024).toFixed(2)}MB`);

  if (base64Size <= MAX_FILE_SIZE) {
    console.log('ImageCompression: Base64 image is already under 1.5MB, no compression needed');
    return { shouldCompress: false, quality: 1.0 };
  }

  console.log('ImageCompression: Base64 image is larger than 1.5MB, will compress...');
  
  // More aggressive compression for larger images
  if (base64Size > 6 * 1024 * 1024) { // > 6MB
    return { shouldCompress: true, quality: 0.2 };
  } else if (base64Size > 4 * 1024 * 1024) { // > 4MB
    return { shouldCompress: true, quality: 0.3 };
  } else if (base64Size > 3 * 1024 * 1024) { // > 3MB (like your 3.4MB image)
    return { shouldCompress: true, quality: 0.4 };
  } else if (base64Size > 2 * 1024 * 1024) { // > 2MB
    return { shouldCompress: true, quality: 0.5 };
  } else {
    return { shouldCompress: true, quality: 0.6 };
  }
}
