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
// Siempre elimina completamente la empresa y todos sus datos asociados
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

    // Get company info before deletion
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        projects: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: { select: { id: true, role: true, active: true } },
          },
        },
      },
    })

    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 })
    }

    const projectCount = company.projects.length

    // Find orphan admins to delete along with the company
    const orphanAdminIds: string[] = []
    for (const member of company.members) {
      if (member.user.role === 'admin') {
        const otherMemberships = await db.companyMember.count({
          where: {
            userId: member.userId,
            NOT: { companyId },
          },
        })
        if (otherMemberships === 0) {
          orphanAdminIds.push(member.userId)
        }
      }
    }

    // ── Delete all projects and their related data manually ──
    // This ensures deletion works even without the CASCADE migration applied
    let deletedProjectCount = 0
    const errors: string[] = []

    for (const project of company.projects) {
      try {
        // Delete in correct order to avoid FK constraint errors
        // Project-level data that references the project
        await db.actionItem.deleteMany({ where: { projectId: project.id } })
        await db.pDCAItem.deleteMany({ where: { projectId: project.id } })
        await db.auditResult.deleteMany({ where: { projectId: project.id } })
        await db.checklistResponse.deleteMany({ where: { projectId: project.id } })
        await db.examAnswer.deleteMany({ where: { projectId: project.id } })
        await db.inventoryItem.deleteMany({ where: { projectId: project.id } })
        await db.employeeProgress.deleteMany({ where: { projectId: project.id } })
        await db.progress.deleteMany({ where: { projectId: project.id } })
        await db.photoLibrary.deleteMany({ where: { projectId: project.id } })
        await db.evaluationSchedule.deleteMany({ where: { projectId: project.id } })
        await db.auditTarget.deleteMany({ where: { projectId: project.id } })
        await db.standard.deleteMany({ where: { projectId: project.id } })

        // Zone-level data: get zones and clean their children
        const zones = await db.zone.findMany({
          where: { projectId: project.id },
          select: { id: true },
        })

        for (const zone of zones) {
          // Delete member zones referencing this zone
          await db.memberZone.deleteMany({ where: { zoneId: zone.id } })
        }

        // Delete board slots and their related data via board configurations
        const boardConfigs = await db.boardConfiguration.findMany({
          where: { zones: { some: { projectId: project.id } } },
          select: { id: true },
        })
        for (const bc of boardConfigs) {
          const slots = await db.boardSlot.findMany({
            where: { boardConfigId: bc.id },
            select: { id: true },
          })
          for (const slot of slots) {
            await db.boardSlotTemplate.deleteMany({ where: { slotId: slot.id } })
            await db.boardSlotStandard.deleteMany({ where: { slotId: slot.id } })
          }
          await db.boardSlot.deleteMany({ where: { boardConfigId: bc.id } })
        }

        // Delete project members (after member zones are deleted)
        await db.projectMember.deleteMany({ where: { projectId: project.id } })

        // Delete zones (after all zone-related data is deleted)
        await db.zone.deleteMany({ where: { projectId: project.id } })

        // Delete board configurations that belong to this project's zones
        await db.boardConfiguration.deleteMany({
          where: { zones: { some: { projectId: project.id } } },
        })

        // Finally delete the project itself
        await db.project.delete({ where: { id: project.id } })
        deletedProjectCount++
      } catch (projectDeleteError) {
        const errMsg = projectDeleteError instanceof Error ? projectDeleteError.message : String(projectDeleteError)
        console.error(`Error deleting project ${project.id} (${project.name}):`, errMsg)
        errors.push(`Proyecto "${project.name}": ${errMsg}`)
      }
    }

    // If some projects failed to delete, try the cascade approach (works if migration is applied)
    if (errors.length > 0 && deletedProjectCount < projectCount) {
      try {
        await db.company.delete({ where: { id: companyId } })
        // If we get here, cascade worked
        return NextResponse.json({
          success: true,
          deletedProjectCount: projectCount,
          deletedAdminCount: 0,
          message: 'Empresa eliminada permanentemente (via cascade)',
        })
      } catch {
        // Cascade didn't work either, report errors
        return NextResponse.json({
          success: false,
          error: `No se pudieron eliminar todos los proyectos. Errores: ${errors.join('; ')}`,
        }, { status: 500 })
      }
    }

    // Delete the company (cascade-deletes CompanyMembers and Subscription)
    await db.company.delete({ where: { id: companyId } })

    // Now delete orphan admin users that no longer have any company
    let deletedAdminCount = 0
    for (const userId of orphanAdminIds) {
      try {
        await db.session.deleteMany({ where: { userId } })
        await db.employeeProgress.deleteMany({ where: { userId } })
        await db.memberZone.deleteMany({ where: { member: { userId } } })
        await db.projectMember.deleteMany({ where: { userId } })
        await db.user.delete({ where: { id: userId } })
        deletedAdminCount++
      } catch (userDeleteError) {
        console.error(`Error deleting orphan admin ${userId}:`, userDeleteError)
      }
    }

    const parts: string[] = ['Empresa eliminada permanentemente']
    if (deletedProjectCount > 0) parts.push(`${deletedProjectCount} proyecto(s) eliminado(s)`)
    if (deletedAdminCount > 0) parts.push(`${deletedAdminCount} administrador(es) eliminado(s)`)

    return NextResponse.json({
      success: true,
      deletedProjectCount,
      deletedAdminCount,
      message: parts.join(' — '),
    })
  } catch (error) {
    console.error('Delete company error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar empresa'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
