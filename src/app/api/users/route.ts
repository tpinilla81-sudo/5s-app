import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

// GET /api/users - List all users with their project memberships
// ✅ UPDATED: Soporta ?search=email para búsqueda (utilizado por el panel de gestor)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    // If search parameter provided, filter by email/name
    const where = search && search.length >= 3
      ? {
          OR: [
            { email: { contains: search.toLowerCase() } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const users = await db.user.findMany({
      where,
      include: {
        memberships: {
          include: {
            project: {
              select: { id: true, name: true, company: true }
            },
            zones: {
              include: {
                zone: {
                  select: { id: true, name: true, color: true }
                }
              },
              orderBy: { assignedAt: 'asc' },
            }
          }
        },
        companyMemberships: {
          include: {
            company: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: search ? 20 : undefined, // Limit results when searching
    })

    const result = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      active: user.active,
      createdAt: user.createdAt,
      companies: user.companyMemberships.map(cm => ({
        id: cm.company.id,
        name: cm.company.name,
        role: cm.role,
      })),
      projects: user.memberships.map(m => ({
        projectId: m.projectId,
        projectName: m.project.name,
        projectCompany: m.project.company,
        role: m.role,
        zones: m.zones.map(mz => ({
          id: mz.zone.id,
          name: mz.zone.name,
          color: mz.zone.color,
        })),
      })),
    }))

    return NextResponse.json({ success: true, users: result })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role, active } = body

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Ya existe un usuario con ese email' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashPassword(password),
        role: role || 'empleado',
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: 'Error al crear usuario' }, { status: 500 })
  }
}

// PUT /api/users - Update user (role, active, password reset)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, email, role, active, password } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de usuario requerido' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // If email is changing, check uniqueness
    if (email && email.trim().toLowerCase() !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
      if (emailTaken) {
        return NextResponse.json({ success: false, error: 'Ya existe un usuario con ese email' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.trim().toLowerCase()
    if (role !== undefined) updateData.role = role
    if (active !== undefined) updateData.active = active
    if (password && password.length >= 6) updateData.password = hashPassword(password)

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
      },
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID de usuario requerido' }, { status: 400 })
    }

    // Don't allow deleting the last admin
    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Protect the last gestor (platform owner) — but allow deleting extras
    if (user.role === 'gestor') {
      const gestorCount = await db.user.count({ where: { role: 'gestor', active: true } })
      if (gestorCount <= 1) {
        return NextResponse.json({ success: false, error: 'No se puede eliminar el último Gestor (dueño de la plataforma)' }, { status: 400 })
      }
    }

    if (user.role === 'admin') {
      // Check if this admin has any company membership
      const companyMembershipCount = await db.companyMember.count({ where: { userId: id } })
      if (companyMembershipCount === 0) {
        // Orphan admin (no company) — allow deletion regardless of total admin count
      } else {
        // Admin with company — protect the last admin
        const adminCount = await db.user.count({ where: { role: 'admin', active: true } })
        if (adminCount <= 1) {
          return NextResponse.json({ success: false, error: 'No se puede eliminar el último administrador' }, { status: 400 })
        }
      }
    }

    // Delete related records first to avoid foreign key constraint errors
    await db.session.deleteMany({ where: { userId: id } })
    await db.employeeProgress.deleteMany({ where: { userId: id } })
    await db.memberZone.deleteMany({ where: { member: { userId: id } } })
    await db.projectMember.deleteMany({ where: { userId: id } })
    await db.companyMember.deleteMany({ where: { userId: id } })

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
