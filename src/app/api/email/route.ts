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

    // Verify the user is a gestor
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor puede enviar emails de invitación' }, { status: 403 })
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

      // Always send copy to gestor if gestorEmail provided
      if (gestorEmail) {
        await sendCompanyCreatedEmail({
          gestorEmail,
          companyName,
          adminName,
          adminEmail,
          appUrl,
        })
      }

      // Mark invitationEmailSent on the CompanyMember if email was sent successfully
      if (result.success && companyId) {
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
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ success: false, error: 'Error al enviar email' }, { status: 500 })
  }
}
