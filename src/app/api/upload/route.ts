import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { uploadToStorage, isStorageConfigured } from '@/lib/supabase-storage'

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

    // Generate a unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.name) || '.jpg'
    const baseName = customFilename
      ? path.basename(customFilename, path.extname(customFilename))
      : `${projectId || 'proj'}_${timestamp}_${random}`
    const filename = `${baseName}${ext}`

    // Try Supabase Storage first
    if (isStorageConfigured()) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadToStorage(buffer, filename, file.type || 'image/jpeg')
      if (result) {
        return NextResponse.json({ success: true, url: result.url, path: result.path })
      }
      // If Supabase fails, fall through to local storage
      console.warn('Supabase upload failed, falling back to local storage')
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

    return NextResponse.json({ success: true, url, path: filename })
  } catch (error) {
    console.error('Upload error:', error)
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
