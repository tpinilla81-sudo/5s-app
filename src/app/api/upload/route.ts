import { NextRequest, NextResponse } from 'next/server'
import { uploadToStorage, isStorageConfigured } from '@/lib/supabase-storage'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filename = formData.get('filename') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    const safeFilename = filename || `photo_${Date.now()}_${file.name || 'upload.jpg'}`
    const contentType = file.type || 'image/jpeg'

    // Strategy 1: Try Supabase Storage (works on Vercel / cloud)
    if (isStorageConfigured()) {
      const result = await uploadToStorage(file, safeFilename, contentType)
      if (result) {
        console.log('[Upload] Uploaded to Supabase Storage:', result.url)
        return NextResponse.json({ success: true, url: result.url })
      }
      // If Supabase failed, fall through to local
      console.warn('[Upload] Supabase upload failed, falling back to local storage')
    }

    // Strategy 2: Local filesystem (works in development)
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'photos')

      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // Sanitize filename: replace spaces and special chars
      const sanitizedFilename = safeFilename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')

      const filePath = path.join(uploadsDir, sanitizedFilename)
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filePath, buffer)

      const publicUrl = `/uploads/photos/${sanitizedFilename}`
      console.log('[Upload] Saved to local filesystem:', publicUrl)

      return NextResponse.json({ success: true, url: publicUrl })
    } catch (localError) {
      console.error('[Upload] Local filesystem save failed:', localError)
      return NextResponse.json(
        { success: false, error: 'Error al guardar el archivo' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al procesar la subida' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL es requerida' },
        { status: 400 }
      )
    }

    // If it's a local file, delete it
    if (url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', url)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return NextResponse.json({ success: true })
      }
    }

    // If it's a Supabase URL, we'd need the path — for now just return success
    // (Supabase cleanup can be handled separately)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Upload] Delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar archivo' },
      { status: 500 }
    )
  }
}
