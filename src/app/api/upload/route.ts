import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { uploadToStorage, isStorageConfigured } from '@/lib/supabase-storage'

// Allow larger uploads (up to 10MB) for layout images and photos
export const maxDuration = 30

/**
 * Sanitize filename: remove spaces, accents and special characters
 */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim leading/trailing underscores
}

/**
 * POST /api/upload
 * Accepts FormData with a 'file' field and optional 'projectId'/'filename'.
 * - If Supabase Storage is configured: uploads there and returns the public URL.
 * - Otherwise: saves to public/uploads/ and returns the relative URL.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('projectId') as string | null
    const customFilename = formData.get('filename') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Generate a unique, sanitized filename (NO spaces or special chars!)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.name) || '.jpg'
    const baseName = customFilename
      ? sanitizeFilename(path.basename(customFilename, path.extname(customFilename)))
      : `${projectId || 'proj'}_${timestamp}_${random}`
    const filename = `${baseName}${ext}`

    console.log(`[Upload] File: ${file.name} → ${filename}, Size: ${(file.size / 1024).toFixed(1)}KB, Type: ${file.type}`)

    // Try Supabase Storage first
    if (isStorageConfigured()) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadToStorage(buffer, filename, file.type || 'image/jpeg')
      if (result) {
        console.log(`[Upload] Supabase OK: ${result.url}`)
        return NextResponse.json({ success: true, url: result.url, path: result.path })
      }
      // If Supabase fails, fall through to local storage
      console.warn('[Upload] Supabase failed, falling back to local storage')
    }

    // Local storage fallback: save to public/uploads/
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

    // Ensure directory exists
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch {
      // Directory might already exist
    }

    const filePath = path.join(uploadsDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Return the relative URL path
    const url = `/uploads/${filename}`
    console.log(`[Upload] Local OK: ${url}`)

    return NextResponse.json({ success: true, url, path: filename })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json({ success: false, error: 'Error al subir archivo' }, { status: 500 })
  }
}

/**
 * DELETE /api/upload?path=filename
 * Deletes a file from local storage or Supabase.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Se requiere el parámetro path' }, { status: 400 })
    }

    // For local files
    const fullPath = path.join(process.cwd(), 'public', filePath)
    const { unlink } = await import('fs/promises')
    try {
      await unlink(fullPath)
    } catch {
      // File might not exist
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar archivo' }, { status: 500 })
  }
}
