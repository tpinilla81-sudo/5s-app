import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/standards/company-estandares
// Returns all standards across all projects of a given company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sStep = searchParams.get('sStep')
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 })
    }

    // Find all projects for this company
    const projects = await db.project.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true, company: true },
    })

    const projectIds = projects.map(p => p.id)

    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, data: [], summary: { total: 0, byCategory: {}, bySStep: {}, byStatus: {} } })
    }

    const where: any = {
      projectId: { in: projectIds },
    }
    if (sStep) where.sStep = Number(sStep)
    if (category) where.category = category
    if (status) where.status = status

    const standards = await db.standard.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
      },
    })

    const parsed = standards.map(std => ({
      ...std,
      content: std.content ? (typeof std.content === 'string' ? JSON.parse(std.content) : std.content) : null,
      projectName: std.project?.name || '',
      zoneName: std.zone?.name || '',
    }))

    // Summary by category, sStep, and status
    const byCategory: Record<string, number> = {}
    const bySStep: Record<number, number> = {}
    const byStatus: Record<string, number> = {}

    for (const item of parsed) {
      const cat = item.category || 'sin_categoria'
      byCategory[cat] = (byCategory[cat] || 0) + 1

      bySStep[item.sStep] = (bySStep[item.sStep] || 0) + 1

      const st = item.status || 'sin_estado'
      byStatus[st] = (byStatus[st] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      summary: {
        total: parsed.length,
        byCategory,
        bySStep,
        byStatus,
        projects: projects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching company standards:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener estándares de la empresa' }, { status: 500 })
  }
}
