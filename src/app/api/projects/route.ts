import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects - List projects with zones and member count
// Admin sees all active projects; gerente sees projects from their companies; non-admin sees only their assigned projects
export async function GET(request: NextRequest) {
  try {
    // Check if user is logged in via session cookie
    const sessionId = request.cookies.get('5s_session')?.value
    let userRole = 'empleado'
    let userId: string | null = null

    if (sessionId) {
      const user = await db.user.findUnique({
        where: { id: sessionId },
        select: { id: true, role: true, active: true },
      })
      if (user && user.active) {
        userRole = user.role
        userId = user.id
      }
    }

    const isAdmin = userRole === 'admin'
    const isGerente = userRole === 'gerente'

    let whereCondition: any = { active: true }

    if (!isAdmin && userId) {
      if (isGerente) {
        // Gerente: see projects from their companies + projects they're directly assigned to
        const companyMemberships = await db.companyMember.findMany({
          where: { userId },
          select: { companyId: true },
        })
        const companyIds = companyMemberships.map((cm) => cm.companyId)

        whereCondition = {
          active: true,
          OR: [
            { members: { some: { userId } } },
            { companyId: { in: companyIds.length > 0 ? companyIds : ['__none__'] } },
          ],
        }
      } else {
        // Non-admin, non-gerente: only their assigned projects
        whereCondition = {
          active: true,
          members: {
            some: {
              userId: userId,
            },
          },
        }
      }
    }

    const projects = await db.project.findMany({
      where: whereCondition,
      include: {
        zones: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true },
        },
        companyRel: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      company: project.company,
      companyId: project.companyId,
      companyName: project.companyRel?.name || project.company,
      startDate: project.startDate,
      active: project.active,
      zones: project.zones,
      memberCount: project._count.members,
    }))

    return NextResponse.json({ projects: result }, { status: 200 })
  } catch (error) {
    console.error('Fetch projects error:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyectos' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project with zones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, company, companyId, zones } = body

    if (!name || !company) {
      return NextResponse.json(
        { error: 'Nombre del proyecto y empresa son requeridos' },
        { status: 400 }
      )
    }

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json(
        { error: 'Debe agregar al menos una zona' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        company: company.trim(),
        companyId: companyId || null,
        zones: {
          create: zones.map((zone: { name: string; description?: string; color?: string }) => ({
            name: zone.name.trim(),
            description: zone.description?.trim() || null,
            color: zone.color || '#3B82F6',
          })),
        },
      },
      include: {
        zones: true,
        _count: {
          select: { members: true },
        },
        companyRel: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          company: project.company,
          companyId: project.companyId,
          companyName: project.companyRel?.name || project.company,
          startDate: project.startDate,
          active: project.active,
          zones: project.zones,
          memberCount: project._count.members,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Error al crear proyecto' },
      { status: 500 }
    )
  }
}
