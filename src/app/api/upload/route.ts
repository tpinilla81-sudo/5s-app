import { NextRequest, NextResponse } from 'next/server'
import { uploadToStorage, isStorageConfigured } from '@/lib/supabase-storage'

/**
 * POST /api/upload
 * 
 * Handles photo uploads for Vercel serverless deployment.
 * Strategy:
 * 1. If Supabase Storage is configured → upload to Supabase, return public URL
 * 2. If not configured → convert to base64 data URL and return it directly
 *    (this gets stored in Neon's photoUrl field — works for small/medium images)
 * 
 * Accepts: multipart/form-data with 'file' field
 * Returns: { success: boolean, url?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filename = (formData.get('filename') as string) || `photo_${Date.now()}.jpg`

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten archivos de imagen' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo supera el límite de 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    // Strategy 1: Upload to Supabase Storage (best for Vercel)
    if (isStorageConfigured()) {
      const result = await uploadToStorage(file, filename, file.type || 'image/jpeg')
      if (result) {
        console.log(`[upload] File uploaded to Supabase: ${result.url}`)
        return NextResponse.json({ success: true, url: result.url })
      }
      // If Supabase upload fails, fall through to base64 strategy
      console.warn('[upload] Supabase upload failed, falling back to base64')
    }

    // Strategy 2: Convert to base64 data URL (stored directly in Neon photoUrl)
    // This works because photos are compressed client-side (max 1200x900, 70% quality ≈ 80-150KB)
    // Neon PostgreSQL can handle text columns with base64 data URLs up to ~1MB comfortably
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`

    const sizeKB = Math.round(base64.length * 0.75 / 1024)
    console.log(`[upload] File converted to base64 data URL (${sizeKB}KB)`)

    // Warn if the base64 is very large (>500KB) — should be rare with client-side compression
    if (sizeKB > 500) {
      console.warn(`[upload] Large base64 image (${sizeKB}KB). Consider configuring Supabase Storage for better performance.`)
    }

    return NextResponse.json({ success: true, url: dataUrl })
  } catch (error) {
    console.error('[upload] Error processing upload:', error)
    return NextResponse.json(
      { success: false, error: 'Error al procesar la subida del archivo' },
      { status: 500 }
    )
  }
}
