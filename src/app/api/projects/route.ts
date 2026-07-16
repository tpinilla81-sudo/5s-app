import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// GET /api/projects - List projects with zones and member count
// Admin sees projects from their companies; gerente same; non-admin sees only their assigned projects
// GESTOR (platform owner) sees ALL projects across all companies.
export async function GET(request: NextRequest) {
  try {
    // Check if user is logged in via session
    const user = await getAuthUser(request)
    const userRole = user?.role || 'empleado'
    const userId: string | null = user?.id || null

    const isGestor = userRole === 'gestor'
    const isAdmin = userRole === 'admin'
    const isGerente = userRole === 'gerente'

    let whereCondition: any = { active: true }

    if (isGestor) {
      // Gestor (platform owner) sees ALL projects
      whereCondition = { active: true }
    } else if (isAdmin || isGerente) {
      // Admin & Gerente: only projects from their companies + projects they're directly assigned to
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
    } else if (userId) {
      // Other roles: only their assigned projects
      whereCondition = {
        active: true,
        members: {
          some: {
            userId: userId,
          },
        },
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
// Only gestor, admin, and gerente can create projects.
// Admin/gerente can only create projects in companies they belong to.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

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

    // Authorization: only gestor, admin, gerente can create projects
    const isGestor = user.role === 'gestor'
    const isAdmin = user.role === 'admin'
    const isGerente = user.role === 'gerente'

    if (!isGestor && !isAdmin && !isGerente) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear proyectos' },
        { status: 403 }
      )
    }

    // Admin/gerente: verify they belong to the company they're creating a project for
    if (!isGestor && companyId) {
      const membership = await db.companyMember.findFirst({
        where: { companyId, userId: user.id },
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'Solo puedes crear proyectos en empresas donde eres miembro' },
          { status: 403 }
        )
      }
    }

    // If admin has no companyId provided, find their first company
    let effectiveCompanyId = companyId
    if (!isGestor && !effectiveCompanyId) {
      const companyMemberships = await db.companyMember.findMany({
        where: { userId: user.id },
        select: { companyId: true },
      })
      if (companyMemberships.length > 0) {
        effectiveCompanyId = companyMemberships[0].companyId
      }
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        company: company.trim(),
        companyId: effectiveCompanyId || null,
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

    // Auto-assign the creator as a project member if admin/gerente
    if (!isGestor) {
      await db.projectMember.upsert({
        where: { userId_projectId: { userId: user.id, projectId: project.id } },
        create: { userId: user.id, projectId: project.id, role: user.role },
        update: {},
      })
    }

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
