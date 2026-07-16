import { Resend } from 'resend'

// Validate RESEND_API_KEY format — Resend keys start with "re_"
function isValidResendKey(key: string | undefined): key is string {
  if (!key) return false
  // Resend API keys start with "re_" and are alphanumeric
  return key.startsWith('re_') && key.length >= 10 && /^[a-zA-Z0-9_]+$/.test(key)
}

// Resolve the effective API key from environment variable only
function getEffectiveKey(): string | null {
  const envKey = process.env.RESEND_API_KEY
  if (isValidResendKey(envKey)) return envKey!
  console.log('[EMAIL] Env var RESEND_API_KEY missing or invalid. Please configure it in Vercel → Settings → Environment Variables.')
  return null
}

// Lazy-initialize Resend only when actually sending (avoid build-time crash)
let _resend: Resend | null = null
function getResend(key: string): Resend {
  if (!_resend) {
    _resend = new Resend(key)
  }
  return _resend
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

const DEFAULT_FROM = '5S App <onboarding@resend.dev>'

// The owner email for Resend's testing mode (free tier can only send to this address)
// This MUST match the email registered on the Resend account
const RESEND_OWNER_EMAIL = 't_pinilla@outlook.com'

/**
 * Send an email using Resend.
 * Gracefully handles missing or invalid API key (logs instead of crashing).
 * In testing mode (unverified domain), redirects emails to the owner with a note.
 */
export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const key = getEffectiveKey()

  if (!key) {
    console.log(`[EMAIL] No valid API key available. Would send to: ${Array.isArray(to) ? to.join(', ') : to}`)
    return { success: false, error: 'RESEND_API_KEY no configurada. Ve a Vercel → Settings → Environment Variables y añade tu API key de Resend (empieza con "re_").' }
  }

  const recipients = Array.isArray(to) ? to : [to]

  try {
    const resend = getResend(key)
    const { error } = await resend.emails.send({
      from: from || DEFAULT_FROM,
      to: recipients,
      subject,
      html,
    })

    if (error) {
      // Check if the error is Resend's testing mode restriction
      const errMsg = typeof error.message === 'string' ? error.message : String(error)
      if (errMsg.includes('testing emails to your own email address') || errMsg.includes('verify a domain')) {
        console.log(`[EMAIL] Testing mode detected. Redirecting to owner: ${RESEND_OWNER_EMAIL}`)

        // Retry sending to the owner email with a note about the original recipient
        const testingNote = `
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0 0 8px;color:#92400e;font-weight:600;">⚠️ Modo de prueba — Email redirigido</p>
            <p style="margin:0;color:#78350f;font-size:14px;">
              Este email iba destinado a: <strong>${recipients.join(', ')}</strong><br>
              En modo de prueba, Resend solo permite enviar a tu propia dirección.<br>
              Para enviar a cualquier destinatario, verifica un dominio en <a href="https://resend.com/domains" style="color:#059669;">resend.com/domains</a>
            </p>
          </div>
        `
        const modifiedHtml = testingNote + html
        const modifiedSubject = `[PRUEBA → ${recipients.join(', ')}] ${subject}`

        try {
          const retryResult = await resend.emails.send({
            from: from || DEFAULT_FROM,
            to: [RESEND_OWNER_EMAIL],
            subject: modifiedSubject,
            html: modifiedHtml,
          })

          if (retryResult.error) {
            console.error('[EMAIL] Retry send error:', retryResult.error)
            return { success: false, error: retryResult.error.message }
          }

          console.log(`[EMAIL] Sent in testing mode to owner: ${RESEND_OWNER_EMAIL} (original: ${recipients.join(', ')}) | Subject: ${subject}`)
          return { success: true, testingMode: true, redirectedTo: RESEND_OWNER_EMAIL, originalRecipients: recipients }
        } catch (retryErr: any) {
          console.error('[EMAIL] Retry exception:', retryErr)
          return { success: false, error: String(retryErr?.message || retryErr) }
        }
      }

      console.error('[EMAIL] Send error:', error)
      return { success: false, error: errMsg }
    }

    console.log(`[EMAIL] Sent to: ${recipients.join(', ')} | Subject: ${subject}`)
    return { success: true }
  } catch (err: any) {
    console.error('[EMAIL] Exception:', err)
    const errMsg = String(err?.message || err)
    if (errMsg.includes('invalid header') || errMsg.includes('Headers.append')) {
      return {
        success: false,
        error: 'RESEND_API_KEY contiene caracteres inválidos. Verifica que la variable de entorno en Vercel tenga una clave válida de Resend (empieza con "re_").'
      }
    }
    return { success: false, error: errMsg }
  }
}

/**
 * Send welcome email to a newly created admin with their credentials.
 */
export async function sendAdminWelcomeEmail(params: {
  adminName: string
  adminEmail: string
  adminPassword: string
  companyName: string
  appUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const { adminName, adminEmail, adminPassword, companyName, appUrl } = params

  const hasPassword = adminPassword && adminPassword.length > 0

  const credentialsSection = hasPassword
    ? `
              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">Tus credenciales:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;color:#374151;font-size:15px;"><strong>Email:</strong></td>
                        <td style="padding:4px 12px;color:#059669;font-size:15px;font-weight:600;">${adminEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#374151;font-size:15px;"><strong>Contraseña:</strong></td>
                        <td style="padding:4px 12px;color:#059669;font-size:15px;font-weight:600;">${adminPassword}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.5;">
                <strong>Recomendación:</strong> Cambia tu contraseña después de iniciar sesión por primera vez.
              </p>`
    : `
              <!-- No password - reset instructions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#92400e;font-size:14px;font-weight:600;">Acceso a la plataforma:</p>
                    <p style="margin:0 0 8px;color:#78350f;font-size:15px;"><strong>Email:</strong> ${adminEmail}</p>
                    <p style="margin:0;color:#78350f;font-size:14px;line-height:1.5;">
                      Tu contraseña inicial te será comunicada por el gestor de la plataforma. Si ya la tienes, inicia sesión con ella.
                    </p>
                  </td>
                </tr>
              </table>`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bienvenido a 5S App</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#059669);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">5S App</h1>
              <p style="margin:8px 0 0;color:#d1fae5;font-size:16px;">Metodología 5S Digital</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">¡Bienvenido, ${adminName}!</h2>
              <p style="margin:0 0 20px;color:#4b5563;font-size:16px;line-height:1.6;">
                Has sido registrado como <strong>administrador</strong> de la empresa <strong>${companyName}</strong> en la plataforma 5S App.
              </p>

              ${credentialsSection}

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#10b981;border-radius:8px;">
                    <a href="${appUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                      Acceder a 5S App
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
                Como administrador de <strong>${companyName}</strong>, podrás crear proyectos, zonas, asignar usuarios y gestionar toda la implementación 5S de tu empresa.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                Este correo fue enviado automáticamente por 5S App. No respondas a este correo.
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;text-align:center;">
                © ${new Date().getFullYear()} 5S App — Metodología 5S Digital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({
    to: adminEmail,
    subject: `Bienvenido a 5S App — Administrador de ${companyName}`,
    html,
  })
}

/**
 * Send notification to gestor when a new company + admin is created.
 */
export async function sendCompanyCreatedEmail(params: {
  gestorEmail: string
  companyName: string
  adminName: string
  adminEmail: string
  appUrl: string
}): Promise<{ success: boolean; error?: string }> {
  const { gestorEmail, companyName, adminName, adminEmail, appUrl } = params

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">5S App</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:16px;">Nueva empresa registrada</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">Nueva empresa creada</h2>
              <p style="margin:0 0 20px;color:#4b5563;font-size:16px;line-height:1.6;">
                Se ha creado una nueva empresa en la plataforma 5S App:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600;">Detalles:</p>
                    <p style="margin:0 0 4px;color:#374151;font-size:15px;"><strong>Empresa:</strong> ${companyName}</p>
                    <p style="margin:0 0 4px;color:#374151;font-size:15px;"><strong>Administrador:</strong> ${adminName}</p>
                    <p style="margin:0;color:#374151;font-size:15px;"><strong>Email:</strong> ${adminEmail}</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#3b82f6;border-radius:8px;">
                    <a href="${appUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                      Ir al panel de gestión
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">
                Se ha enviado un email de bienvenida al administrador con sus credenciales de acceso.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                © ${new Date().getFullYear()} 5S App — Metodología 5S Digital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return sendEmail({
    to: gestorEmail,
    subject: `Nueva empresa registrada: ${companyName}`,
    html,
  })
}
