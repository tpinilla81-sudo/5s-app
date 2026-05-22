import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Ensure the uploads directory exists
async function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
  try {
    await mkdir(uploadsDir, { recursive: true })
  } catch {
    // Directory might already exist
  }
  return uploadsDir
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

    const uploadsDir = await ensureUploadsDir()

    // Use provided filename or generate one
    const safeFilename = filename || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`
    const filepath = path.join(uploadsDir, safeFilename)

    // Write the file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the public URL path
    const url = `/uploads/photos/${safeFilename}`

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

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename required' }, { status: 400 })
    }

    // Security: only allow deleting from uploads/photos directory
    const safeName = path.basename(filename) // Prevent directory traversal
    const filepath = path.join(process.cwd(), 'public', 'uploads', 'photos', safeName)

    const { unlink } = await import('fs/promises')
    try {
      await unlink(filepath)
    } catch {
      // File might not exist
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 })
  }
}
