import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGerenteUser } from '@/lib/auth-helpers'

/**
 * GET /api/gerente/actions?company=Empresa+Demo&estado=abierta&prioridad=alta&projectId=xxx&sStep=1
 *
 * Returns all action items across all projects of a company,
 * with project and zone info (including responsable per zone) attached,
 * filterable by status, priority, project, S-step.
 * Also supports updating actions (PUT) for assignment, deadlines, etc.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getGerenteUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    const estado = searchParams.get('estado')
    const prioridad = searchParams.get('prioridad')
    const projectId = searchParams.get('projectId')
    const sStep = searchParams.get('sStep')
    const responsable = searchParams.get('responsable')

    if (!company) {
      return NextResponse.json({ success: false, error: 'company parameter is required' }, { status: 400 })
    }

    // Get all projects for this company, with zones and their responsable members
    const projects = await db.project.findMany({
      where: { company },
      select: {
        id: true,
        name: true,
        company: true,
        zones: {
          select: {
            id: true,
            name: true,
            color: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
        },
      },
    })

    const projectIds = projects.map(p => p.id)

    // Build where clause
    const where: any = { projectId: { in: projectIds } }
    if (estado) where.estado = estado
    if (prioridad) where.prioridad = prioridad
    if (projectId) where.projectId = projectId
    if (sStep) where.sStep = parseInt(sStep)
    if (responsable) where.responsable = { contains: responsable }

    const actions = await db.actionItem.findMany({
      where,
      orderBy: [
        { prioridad: 'desc' },
        { fechaLimite: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Attach project and zone info to each action (with responsable per zone)
    const projectMap = new Map(projects.map(p => [p.id, p]))

    // Get all members for these projects (for responsable dropdown)
    const members = await db.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      include: { user: { select: { name: true, email: true } }, zone: { select: { name: true, color: true } } },
    })

    const enrichedActions = actions.map(action => {
      const proj = projectMap.get(action.projectId)
      // Build zones with responsable info
      const zonesWithResponsable = proj?.zones.map(z => {
        const resp = z.members.find(m => m.role === 'responsable')
        return {
          id: z.id,
          name: z.name,
          color: z.color,
          responsable: resp ? { id: resp.user.id, name: resp.user.name, email: resp.user.email } : null,
        }
      }) || []

      return {
        ...action,
        projectName: proj?.name || 'Desconocido',
        projectZones: zonesWithResponsable,
      }
    })

    // Summary stats
    const totalActions = actions.length
    const overdue = actions.filter(a =>
      a.fechaLimite && new Date(a.fechaLimite) < new Date() && !['cerrada', 'resuelta'].includes(a.estado)
    ).length

    // Unique responsables (from action items)
    const responsables = [...new Set(actions.map(a => a.responsable).filter(Boolean) as string[])]

    // Available team members for assignment (from all project members)
    const availableMembers = members.map(m => ({
      name: m.user.name,
      email: m.user.email,
      zone: m.zone?.name || null,
      role: m.role,
    }))

    return NextResponse.json({
      success: true,
      data: {
        actions: enrichedActions,
        total: totalActions,
        overdue,
        responsables,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          zones: p.zones.map(z => ({
            id: z.id,
            name: z.name,
            color: z.color,
            responsable: z.members.find(m => m.role === 'responsable')?.user.name || null,
          })),
        })),
        availableMembers,
      },
    })
  } catch (error) {
    console.error('Error fetching gerente actions:', error)
    return NextResponse.json({ success: false, error: 'Error fetching gerente actions' }, { status: 500 })
  }
}

/**
 * PUT /api/gerente/actions
 *
 * Update an action item (assign responsable, change status, set deadline, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const user = await getGerenteUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, responsable, estado, prioridad, fechaLimite, notas, mejora } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Action id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (responsable !== undefined) updateData.responsable = responsable
    if (estado !== undefined) {
      updateData.estado = estado
      if (estado === 'resuelta' || estado === 'cerrada') {
        updateData.fechaResolucion = new Date()
      }
    }
    if (prioridad !== undefined) updateData.prioridad = prioridad
    if (fechaLimite !== undefined) updateData.fechaLimite = fechaLimite ? new Date(fechaLimite) : null
    if (notas !== undefined) updateData.notas = notas
    if (mejora !== undefined) updateData.mejora = mejora

    const updated = await db.actionItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating gerente action:', error)
    return NextResponse.json({ success: false, error: 'Error updating gerente action' }, { status: 500 })
  }
}
