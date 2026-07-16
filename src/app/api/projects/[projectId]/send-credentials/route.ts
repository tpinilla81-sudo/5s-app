import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendResourceWelcomeEmail } from '@/lib/email'

// POST /api/projects/[projectId]/send-credentials — Send welcome email with credentials to a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { memberId, password } = body

    if (!memberId) {
      return NextResponse.json(
        { error: 'ID de miembro requerido' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Se requiere una contraseña válida (mínimo 6 caracteres)' },
        { status: 400 }
      )
    }

    // Find the member with user and zone info
    const member = await db.projectMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        zones: {
          include: {
            zone: {
              select: { id: true, name: true },
            },
          },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Miembro no encontrado en este proyecto' },
        { status: 404 }
      )
    }

    const zoneNames = member.zones.map(mz => mz.zone.name)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://5s-app-one.vercel.app'

    const result = await sendResourceWelcomeEmail({
      resourceName: member.user.name,
      resourceEmail: member.user.email,
      resourcePassword: password,
      projectName: member.project.name,
      zoneNames,
      role: member.role,
      appUrl,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        testingMode: (result as any).testingMode || false,
        redirectedTo: (result as any).redirectedTo || null,
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Error al enviar el email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Send credentials error:', error)
    return NextResponse.json(
      { error: 'Error al enviar credenciales' },
      { status: 500 }
    )
  }
}
