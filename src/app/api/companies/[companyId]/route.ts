import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/companies/[companyId] - Get company with projects and members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const isAdmin = user.role === 'admin' || user.role === 'constructor'
    const isMember = !isAdmin ? await db.companyMember.findFirst({
      where: { companyId, userId: user.id },
    }) : true

    if (!isAdmin && !isMember) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        projects: {
          where: { active: true },
          include: {
            _count: { select: { members: true } },
            zones: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, active: true } },
          },
          orderBy: { joinedAt: 'desc' },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        active: company.active,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        projects: company.projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          company: p.company,
          companyId: p.companyId,
          startDate: p.startDate,
          active: p.active,
          zones: p.zones,
          memberCount: p._count.members,
        })),
        members: company.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          companyId: m.companyId,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user,
        })),
      },
    })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener empresa' }, { status: 500 })
  }
}

// PUT /api/companies/[companyId] - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user || (user.role !== 'admin' && user.role !== 'constructor')) {
      return NextResponse.json({ success: false, error: 'Solo administradores pueden editar empresas' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, active } = body

    const data: any = {}
    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (active !== undefined) data.active = active

    // Check for duplicate name if changing
    if (name) {
      const existing = await db.company.findFirst({
        where: { name: name.trim(), NOT: { id: companyId } },
      })
      if (existing) {
        return NextResponse.json({ success: false, error: 'Ya existe una empresa con ese nombre' }, { status: 400 })
      }
    }

    const company = await db.company.update({
      where: { id: companyId },
      data,
      include: {
        _count: { select: { projects: true, members: true } },
      },
    })

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        description: company.description,
        active: company.active,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        projectCount: company._count.projects,
        memberCount: company._count.members,
      },
    })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar empresa' }, { status: 500 })
  }
}

// DELETE /api/companies/[companyId] - Delete company (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user || (user.role !== 'admin' && user.role !== 'constructor')) {
      return NextResponse.json({ success: false, error: 'Solo administradores pueden eliminar empresas' }, { status: 403 })
    }

    // Check company has no projects with data
    const projectCount = await db.project.count({ where: { companyId } })
    if (projectCount > 0) {
      // Soft delete instead
      await db.company.update({
        where: { id: companyId },
        data: { active: false },
      })
      return NextResponse.json({ success: true, message: 'Empresa desactivada (tiene proyectos asociados)' })
    }

    await db.company.delete({ where: { id: companyId } })
    return NextResponse.json({ success: true, message: 'Empresa eliminada' })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar empresa' }, { status: 500 })
  }
}
