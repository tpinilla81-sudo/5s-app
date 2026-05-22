/**
 * Supabase Storage utilities for photo uploads.
 * Replaces local filesystem storage for Vercel serverless deployment.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for server-side operations
 */

// We use the REST API directly instead of the SDK to avoid bundling issues
// and keep the bundle size small.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET_NAME = 'photos'

/**
 * Upload a file to Supabase Storage.
 */
export async function uploadToStorage(
  file: File | Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<{ url: string; path: string } | null> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Supabase credentials not configured')
      return null
    }

    const storagePath = `5s-photos/${filename}`

    let arrayBuffer: ArrayBuffer
    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer()
    } else {
      arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
    }

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: arrayBuffer,
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase upload error:', errorText)
      return null
    }

    // Construct the public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`

    return { url: publicUrl, path: storagePath }
  } catch (error) {
    console.error('Storage upload error:', error)
    return null
  }
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFromStorage(filePath: string): Promise<boolean> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filePath}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    return response.ok
  } catch (error) {
    console.error('Storage delete error:', error)
    return false
  }
}

/**
 * Check if Supabase Storage is properly configured.
 */
export function isStorageConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY)
}

/**
 * Create the photos bucket if it doesn't exist.
 * Call this once during setup/migration.
 */
export async function ensurePhotosBucket(): Promise<boolean> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return false

    // Check if bucket exists
    const listResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/bucket`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    if (listResponse.ok) {
      const buckets = await listResponse.json()
      const exists = buckets.some((b: { id: string }) => b.id === BUCKET_NAME)
      if (exists) return true
    }

    // Create bucket
    const createResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/bucket`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: BUCKET_NAME,
          name: BUCKET_NAME,
          public: true,
          fileSizeLimit: 5242880, // 5MB
        }),
      }
    )

    return createResponse.ok
  } catch (error) {
    console.error('Bucket creation error:', error)
    return false
  }
}
