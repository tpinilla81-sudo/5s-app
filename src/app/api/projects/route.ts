import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects - List projects with zones and member count
// Admin sees all active projects; non-admin sees only their assigned projects
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

    const projects = await db.project.findMany({
      where: {
        active: true,
        ...(!isAdmin && userId ? {
          members: {
            some: {
              userId: userId,
            },
          },
        } : {}),
      },
      include: {
        zones: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      company: project.company,
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
    const { name, description, company, zones } = body

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
      },
    })

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          company: project.company,
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
