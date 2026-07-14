import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/upload
 * 
 * Handles photo uploads for Vercel serverless deployment.
 * Stores photos as base64 data URLs directly in Neon PostgreSQL (photoUrl field).
 * 
 * This works because:
 * - Photos are compressed client-side (max 1200x900px, 70% JPEG quality ≈ 80-150KB)
 * - Neon PostgreSQL `text` column has no practical size limit
 * - Base64 adds ~33% overhead, so a 150KB photo becomes ~200KB in the DB
 * - Vercel serverless has a 4.5MB body limit, more than enough
 * 
 * Accepts: multipart/form-data with 'file' field
 * Returns: { success: boolean, url?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

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

    // Validate file size (max 10MB — but client-side compression should keep it well under)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `El archivo supera el límite de 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      )
    }

    // Convert to base64 data URL → stored directly in Neon photoUrl column
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`

    const sizeKB = Math.round(base64.length * 0.75 / 1024)
    console.log(`[upload] Photo stored as base64 in Neon (${sizeKB}KB)`)

    if (sizeKB > 500) {
      console.warn(`[upload] Large photo (${sizeKB}KB). Client-side compression should keep photos under 200KB.`)
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
