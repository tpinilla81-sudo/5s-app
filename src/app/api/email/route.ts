import { NextRequest, NextResponse } from 'next/server'
import { sendAdminWelcomeEmail, sendCompanyCreatedEmail } from '@/lib/email'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

/**
 * POST /api/email
 * Sends welcome/invitation emails to company admins.
 * Called manually by the gestor from the ConstructorPanel "Enviar Email" button.
 *
 * Body: {
 *   type: 'admin_welcome' | 'company_created',
 *   companyId: string,            // Required: to find and mark the CompanyMember
 *   adminName: string,
 *   adminEmail: string,
 *   adminPassword?: string,       // Optional: for admin_welcome with credentials
 *   companyName: string,
 *   gestorEmail?: string,         // CC recipient (always sent copy when provided)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, companyId, adminName, adminEmail, adminPassword, companyName, gestorEmail } = body

    if (!type || !adminName || !adminEmail || !companyName) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Verify the user is authenticated (gestor or admin can send emails)
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    if (user.role !== 'gestor' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No tienes permisos para enviar emails de invitación' }, { status: 403 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://5s-app-one.vercel.app'

    if (type === 'admin_welcome') {
      // Send welcome email to the admin
      const result = await sendAdminWelcomeEmail({
        adminName,
        adminEmail,
        adminPassword: adminPassword || '',
        companyName,
        appUrl,
      })

      // If email failed, return the error immediately (don't send CC if main email failed)
      if (!result.success) {
        return NextResponse.json(result)
      }

      // If in testing mode, inform the frontend
      if (result.testingMode) {
        return NextResponse.json({
          success: true,
          testingMode: true,
          message: `Email enviado en modo de prueba a ${result.redirectedTo} (destino original: ${result.originalRecipients?.join(', ')}). Para enviar a cualquier destinatario, verifica un dominio en resend.com/domains.`,
        })
      }

      // Send copy to gestor if gestorEmail provided (non-blocking — don't fail if CC fails)
      if (gestorEmail) {
        const ccResult = await sendCompanyCreatedEmail({
          gestorEmail,
          companyName,
          adminName,
          adminEmail,
          appUrl,
        })
        if (!ccResult.success) {
          console.warn('[EMAIL] CC to gestor failed:', ccResult.error)
          // Don't fail the main request — the admin email was sent successfully
        }
      }

      // Mark invitationEmailSent on the CompanyMember if email was sent successfully
      if (companyId) {
        try {
          await db.companyMember.updateMany({
            where: {
              companyId,
              OR: [
                { role: 'admin_empresa' },
                { role: 'admin' },
              ],
            },
            data: { invitationEmailSent: true },
          })
        } catch (dbErr) {
          console.error('Error marking invitationEmailSent:', dbErr)
          // Don't fail the request — email was sent successfully
        }
      }

      return NextResponse.json(result)
    }

    if (type === 'company_created') {
      if (!gestorEmail) {
        return NextResponse.json({ success: false, error: 'Email del gestor requerido' }, { status: 400 })
      }

      const result = await sendCompanyCreatedEmail({
        gestorEmail,
        companyName,
        adminName,
        adminEmail,
        appUrl,
      })

      return NextResponse.json(result)
    }

    return NextResponse.json({ success: false, error: 'Tipo de email no reconocido' }, { status: 400 })
  } catch (error: any) {
    console.error('Error sending email:', error)

    // Provide helpful error messages
    const errMsg = String(error?.message || error)
    if (errMsg.includes('RESEND_API_KEY') || errMsg.includes('invalid header') || errMsg.includes('Headers.append')) {
      return NextResponse.json({
        success: false,
        error: 'Error de configuración: La API key de Resend no es válida. Ve a Vercel → Settings → Environment Variables y configura RESEND_API_KEY con una clave válida (empieza con "re_").'
      }, { status: 500 })
    }

    return NextResponse.json({ success: false, error: 'Error al enviar email. Inténtalo de nuevo.' }, { status: 500 })
  }
}
