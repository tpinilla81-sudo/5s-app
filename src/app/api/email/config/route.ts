import { NextResponse } from 'next/server'

/**
 * GET /api/email/config
 * Checks if email sending is properly configured (RESEND_API_KEY exists and is valid).
 * Returns { configured: boolean, message: string }
 * No auth required — this is just a config check.
 */
export async function GET() {
  const key = process.env.RESEND_API_KEY

  if (!key) {
    return NextResponse.json({
      configured: false,
      message: 'RESEND_API_KEY no configurada. Ve a Vercel → Settings → Environment Variables y añade RESEND_API_KEY.',
    })
  }

  // Resend API keys start with "re_" and are at least 10 chars
  const isValid = key.startsWith('re_') && key.length >= 10 && /^[a-zA-Z0-9_]+$/.test(key)

  if (!isValid) {
    return NextResponse.json({
      configured: false,
      message: 'RESEND_API_KEY tiene formato inválido. Debe ser una clave válida de Resend (empieza con "re_").',
    })
  }

  return NextResponse.json({
    configured: true,
    message: 'Email configurado correctamente',
  })
}
