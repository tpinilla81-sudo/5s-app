/**
 * Image compression utilities for client-side photo optimization.
 * Reduces photo size before uploading to save database space and bandwidth.
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 900;
const JPEG_QUALITY = 0.7; // 70% quality - good balance between size and visual quality

/**
 * Compress an image file or base64 data URL.
 * Returns a compressed JPEG base64 data URL.
 */
export async function compressImage(source: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Use high-quality downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with compression
        const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        resolve(compressed);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    // Load from source
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Convert a base64 data URL to a File object for upload.
 */
export function base64toFile(base64: string, filename: string): File {
  const arr = base64.split(',');
  const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Generate a unique filename for a photo upload.
 */
export function generatePhotoFilename(projectId: string, sStep: number, miniStep: number, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${projectId}_S${sStep}_M${miniStep}_${index}_${timestamp}_${random}.jpg`;
}

/**
 * Estimate the size of a base64 string in bytes.
 */
export function estimateBase64Size(base64: string): number {
  const base64Length = base64.split(',')[1]?.length || 0;
  return Math.round((base64Length * 3) / 4);
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
