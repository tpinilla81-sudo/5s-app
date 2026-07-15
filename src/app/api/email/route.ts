import { NextRequest, NextResponse } from 'next/server'
import { sendAdminWelcomeEmail, sendCompanyCreatedEmail } from '@/lib/email'
import { db } from '@/lib/db'

/**
 * POST /api/email
 * Sends welcome/notifications emails when a company + admin is created.
 * Called from the GestorPanel after successful creation.
 *
 * Body: {
 *   type: 'admin_welcome' | 'company_created',
 *   adminName: string,
 *   adminEmail: string,
 *   adminPassword: string,       // only for admin_welcome
 *   companyName: string,
 *   gestorEmail?: string,         // only for company_created
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, adminName, adminEmail, adminPassword, companyName, gestorEmail } = body

    if (!type || !adminName || !adminEmail || !companyName) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://5s-app-one.vercel.app'

    if (type === 'admin_welcome') {
      if (!adminPassword) {
        return NextResponse.json({ success: false, error: 'Contraseña requerida para email de bienvenida' }, { status: 400 })
      }

      const result = await sendAdminWelcomeEmail({
        adminName,
        adminEmail,
        adminPassword,
        companyName,
        appUrl,
      })

      // Also send notification to gestor if provided
      if (gestorEmail) {
        await sendCompanyCreatedEmail({
          gestorEmail,
          companyName,
          adminName,
          adminEmail,
          appUrl,
        })
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
