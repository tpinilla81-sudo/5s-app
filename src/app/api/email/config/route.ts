import { NextResponse } from 'next/server'

function isValidResendKey(key: string | undefined): key is string {
  if (!key) return false
  return key.startsWith('re_') && key.length >= 10 && /^[a-zA-Z0-9_]+$/.test(key)
}

/**
 * GET /api/email/config
 * Checks if email sending is properly configured.
 * Only uses the RESEND_API_KEY env var — no fallback.
 */
export async function GET() {
  const envKey = process.env.RESEND_API_KEY

  if (!isValidResendKey(envKey)) {
    return NextResponse.json({
      configured: false,
      message: 'RESEND_API_KEY no configurada. Ve a Vercel → Settings → Environment Variables y añade tu API key de Resend (empieza con "re_").',
    })
  }

  return NextResponse.json({
    configured: true,
    message: 'Email configurado correctamente',
    source: 'env_var',
  })
}
