import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

function hashPasswordSync(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET /api/projects/[projectId]/members - List members with zones, role, and password
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
            plainPassword: true,
          },
        },
        zones: {
          include: {
            zone: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    // Transform to include zones array instead of nested MemberZone
    const transformedMembers = members.map(m => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
      zones: m.zones.map(mz => ({
        id: mz.zone.id,
        name: mz.zone.name,
        color: mz.zone.color,
      })),
    }))

    return NextResponse.json({ members: transformedMembers }, { status: 200 })
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
    const { email, name, role, zoneIds, password, userId } = body

    // Either userId (existing user) OR email+name (new user) must be provided
    if (!userId && (!email || !name)) {
      return NextResponse.json(
        { error: 'Proporciona userId (usuario existente) o email y nombre (nuevo usuario)' },
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
    let user = null
    let isNewUser = false
    let rawPassword = password && password.length >= 6 ? password : '123456'

    if (userId) {
      // Use existing user by ID
      user = await db.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      }
    } else {
      // Find or create by email
      user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      })

      if (!user) {
        // Create user with provided password or default
        const hashedPassword = hashPasswordSync(rawPassword)
        user = await db.user.create({
          data: {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            password: hashedPassword,
            plainPassword: rawPassword,
            role: memberRole,
          },
        })
        isNewUser = true
      }
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

    // Validate zoneIds if provided — if none provided, auto-assign ALL project zones
    const validZoneIds: string[] = []
    if (zoneIds && Array.isArray(zoneIds) && zoneIds.length > 0) {
      for (const zoneId of zoneIds) {
        if (!zoneId || zoneId === 'none') continue
        const zone = await db.zone.findUnique({
          where: { id: zoneId },
        })
        if (zone && zone.projectId === projectId) {
          validZoneIds.push(zoneId)
        }
      }
    } else {
      // Auto-assign ALL zones in the project (better to remove than to add)
      const allZones = await db.zone.findMany({
        where: { projectId },
        select: { id: true },
      })
      validZoneIds.push(...allZones.map(z => z.id))
    }

    // Create member with zones
    const member = await db.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        role: memberRole,
        zones: {
          create: validZoneIds.map(zoneId => ({
            zoneId,
          })),
        },
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
            plainPassword: true,
          },
        },
        zones: {
          include: {
            zone: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    })

    // Transform response — include generated password for new users only
    const transformedMember = {
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt,
      user: member.user,
      zones: member.zones.map(mz => ({
        id: mz.zone.id,
        name: mz.zone.name,
        color: mz.zone.color,
      })),
      generatedPassword: isNewUser ? rawPassword : undefined,
    }

    return NextResponse.json({ member: transformedMember }, { status: 201 })
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

    // MemberZone records will be cascade deleted
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

// PATCH /api/projects/[projectId]/members - Update a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { memberId, role } = body

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'ID de miembro y rol son requeridos' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'gerente', 'responsable', 'empleado', 'auditor']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rol no válido' },
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

    // Update both the ProjectMember role and the User role
    await db.projectMember.update({
      where: { id: memberId },
      data: { role },
    })

    await db.user.update({
      where: { id: member.userId },
      data: { role },
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar miembro' },
      { status: 500 }
    )
  }
}
