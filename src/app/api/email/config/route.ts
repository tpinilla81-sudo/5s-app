import { NextResponse } from 'next/server'

// Same fallback as in email.ts
const RESEND_FALLBACK_KEY = 're_Mm6ttJsG_C9U8KFX9BFMxpCokHQaC8NSK'

function isValidResendKey(key: string | undefined): key is string {
  if (!key) return false
  return key.startsWith('re_') && key.length >= 10 && /^[a-zA-Z0-9_]+$/.test(key)
}

/**
 * GET /api/email/config
 * Checks if email sending is properly configured.
 * Uses fallback key if env var is missing or invalid.
 */
export async function GET() {
  const envKey = process.env.RESEND_API_KEY
  const effectiveKey = isValidResendKey(envKey) ? envKey! : RESEND_FALLBACK_KEY

  if (!isValidResendKey(effectiveKey)) {
    return NextResponse.json({
      configured: false,
      message: 'RESEND_API_KEY no configurada y fallback no disponible.',
    })
  }

  return NextResponse.json({
    configured: true,
    message: 'Email configurado correctamente',
    source: isValidResendKey(envKey) ? 'env_var' : 'fallback',
  })
}
