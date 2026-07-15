import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// GET /api/companies/[companyId] - Get company with projects and members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const isGestor = user.role === 'gestor'
    const isMember = !isGestor ? await db.companyMember.findFirst({
      where: { companyId, userId: user.id },
    }) : true

    if (!isGestor && !isMember) {
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
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    if (user.role !== 'gestor' && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Sin permisos para editar empresas' }, { status: 403 })
    }

    // Admin can only edit companies they're a member of; gestor can edit any
    if (user.role === 'admin') {
      const membership = await db.companyMember.findFirst({ where: { companyId, userId: user.id } })
      if (!membership) {
        return NextResponse.json({ success: false, error: 'Solo puedes editar empresas donde eres miembro' }, { status: 403 })
      }
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

// DELETE /api/companies/[companyId] - Delete company (gestor only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    if (user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor (dueño de la app) puede eliminar empresas' }, { status: 403 })
    }

    // Get company members before deletion to handle orphan admins
    const companyMembers = await db.companyMember.findMany({
      where: { companyId },
      include: {
        user: {
          select: { id: true, role: true, active: true },
        },
      },
    })

    // Check company has no projects with data
    const projectCount = await db.project.count({ where: { companyId } })
    if (projectCount > 0) {
      // Soft delete — deactivate company
      await db.company.update({
        where: { id: companyId },
        data: { active: false },
      })

      // Also deactivate admin users that only belong to this company
      for (const member of companyMembers) {
        if (member.user.role === 'admin') {
          const otherMemberships = await db.companyMember.count({
            where: {
              userId: member.userId,
              NOT: { companyId },
            },
          })
          // If this admin only belongs to this company, deactivate them too
          if (otherMemberships === 0) {
            await db.user.update({
              where: { id: member.userId },
              data: { active: false },
            })
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Empresa y administrador desactivados (tiene proyectos asociados)' })
    }

    // Hard delete — find orphan admins to delete along with the company
    const orphanAdminIds: string[] = []
    for (const member of companyMembers) {
      if (member.user.role === 'admin') {
        const otherMemberships = await db.companyMember.count({
          where: {
            userId: member.userId,
            NOT: { companyId },
          },
        })
        // If this admin only belongs to this company, mark for deletion
        if (otherMemberships === 0) {
          orphanAdminIds.push(member.userId)
        }
      }
    }

    // Delete the company (cascade-deletes CompanyMembers and Subscription)
    await db.company.delete({ where: { id: companyId } })

    // Now delete orphan admin users that no longer have any company
    let deletedAdminCount = 0
    for (const userId of orphanAdminIds) {
      try {
        // Clean up user's related records before deletion
        await db.session.deleteMany({ where: { userId } })
        await db.employeeProgress.deleteMany({ where: { userId } })
        await db.memberZone.deleteMany({ where: { member: { userId } } })
        await db.projectMember.deleteMany({ where: { userId } })
        // CompanyMember already cascade-deleted with company
        await db.user.delete({ where: { id: userId } })
        deletedAdminCount++
      } catch (userDeleteError) {
        console.error(`Error deleting orphan admin ${userId}:`, userDeleteError)
        // Continue with other admins even if one fails
      }
    }

    const message = deletedAdminCount > 0
      ? `Empresa eliminada junto con ${deletedAdminCount} administrador(es) asociado(s)`
      : 'Empresa eliminada'

    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar empresa' }, { status: 500 })
  }
}
