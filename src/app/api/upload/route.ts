import { NextRequest, NextResponse } from 'next/server'
import { uploadToStorage, deleteFromStorage, isStorageConfigured } from '@/lib/supabase-storage'

// Fallback: local filesystem storage for development
async function saveToLocal(file: File, filename: string): Promise<string | null> {
  try {
    const { writeFile, mkdir } = await import('fs/promises')
    const path = await import('path')

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
    try { await mkdir(uploadsDir, { recursive: true }) } catch {}

    const filepath = path.join(uploadsDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    return `/uploads/photos/${filename}`
  } catch (error) {
    console.error('Local save error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filename = formData.get('filename') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 5MB after compression)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const safeFilename = filename || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`

    // Try Supabase Storage first (production), fallback to local (development)
    let url: string | null = null

    if (isStorageConfigured()) {
      const result = await uploadToStorage(file, safeFilename, file.type || 'image/jpeg')
      if (result) {
        url = result.url
      }
    }

    // Fallback to local filesystem if Supabase is not configured or upload failed
    if (!url) {
      url = await saveToLocal(file, safeFilename)
    }

    if (!url) {
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url,
      filename: safeFilename,
      size: file.size,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const storagePath = searchParams.get('path')

    if (!filename && !storagePath) {
      return NextResponse.json({ success: false, error: 'Filename or path required' }, { status: 400 })
    }

    // Try deleting from Supabase Storage
    if (isStorageConfigured() && storagePath) {
      await deleteFromStorage(storagePath)
    }

    // Also try deleting from local filesystem (for development)
    try {
      const path = await import('path')
      const { unlink } = await import('fs/promises')
      const safeName = path.basename(filename || '')
      if (safeName) {
        const filepath = path.join(process.cwd(), 'public', 'uploads', 'photos', safeName)
        try { await unlink(filepath) } catch {}
      }
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}
