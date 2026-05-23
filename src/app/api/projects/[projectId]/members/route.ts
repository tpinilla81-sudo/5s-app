import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

function hashPasswordSync(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET /api/projects/[projectId]/members - List members with zone and role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            active: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json({ members }, { status: 200 })
  } catch (error) {
    console.error('Fetch members error:', error)
    return NextResponse.json(
      { error: 'Error al obtener miembros' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[projectId]/members - Add a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { email, name, role, zoneId, password } = body

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email y nombre son requeridos' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'gerente', 'responsable', 'empleado', 'auditor']
    const memberRole = validRoles.includes(role) ? role : 'empleado'

    // Check if project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      // Create user with provided password or default
      const hashedPassword = hashPasswordSync(password && password.length >= 6 ? password : '123456')
      user = await db.user.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          password: hashedPassword,
          role: memberRole,
        },
      })
    }

    // Check if already a member
    const existingMember = await db.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Este usuario ya es miembro del proyecto' },
        { status: 409 }
      )
    }

    // Validate zoneId if provided
    if (zoneId) {
      const zone = await db.zone.findUnique({
        where: { id: zoneId },
      })
      if (!zone || zone.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Zona no válida para este proyecto' },
          { status: 400 }
        )
      }
    }

    const member = await db.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        zoneId: zoneId || null,
        role: memberRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            active: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json(
      { error: 'Error al agregar miembro' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId]/members - Remove a member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json(
        { error: 'ID de miembro requerido' },
        { status: 400 }
      )
    }

    const member = await db.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Miembro no encontrado en este proyecto' },
        { status: 404 }
      )
    }

    await db.projectMember.delete({
      where: { id: memberId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar miembro' },
      { status: 500 }
    )
  }
}
