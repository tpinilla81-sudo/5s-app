import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/companies - List companies
// Gestor sees all; admin/gerente sees their assigned companies only
export async function GET(request: NextRequest) {
  try {
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

    const isGestor = userRole === 'gestor'

    let companies
    if (isGestor) {
      companies = await db.company.findMany({
        where: { active: true },
        include: {
          _count: { select: { projects: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (userId) {
      // Non-admin: only see companies they're a member of
      companies = await db.company.findMany({
        where: {
          active: true,
          members: { some: { userId } },
        },
        include: {
          _count: { select: { projects: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      companies = []
    }

    const result = companies.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      active: c.active,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      projectCount: c._count.projects,
      memberCount: c._count.members,
    }))

    return NextResponse.json({ success: true, companies: result })
  } catch (error) {
    console.error('Fetch companies error:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener empresas' }, { status: 500 })
  }
}

// POST /api/companies - Create company (SOLO gestor, dueño de la app)
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor (dueño de la app) puede crear empresas' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre de la empresa es requerido' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await db.company.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Ya existe una empresa con ese nombre' }, { status: 400 })
    }

    const company = await db.company.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
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
    }, { status: 201 })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json({ success: false, error: 'Error al crear empresa' }, { status: 500 })
  }
}
