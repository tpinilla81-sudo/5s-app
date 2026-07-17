import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory/company-necesarios
// Returns all S2 inventory items across all projects of a given company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const categoryFilter = searchParams.get('category')

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
      return NextResponse.json({ success: true, data: [], summary: { total: 0, byCategory: {}, valorTotal: 0 } })
    }

    const where: any = {
      sStep: 2,
      projectId: { in: projectIds },
    }

    if (categoryFilter) {
      where.category = categoryFilter
    }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
        photos: true,
      },
    })

    const parsed = items.map(item => ({
      ...item,
      extra: item.extra ? JSON.parse(item.extra) : null,
      photoUrls: item.photoUrls ? JSON.parse(item.photoUrls) : null,
      projectName: item.project?.name || '',
      zoneName: item.zone?.name || '',
    }))

    // Summary by category
    const byCategory: Record<string, number> = {}
    for (const item of parsed) {
      const cat = item.category || 'sin_categoria'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }

    const valorTotal = parsed.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

    return NextResponse.json({
      success: true,
      data: parsed,
      summary: {
        total: parsed.length,
        byCategory,
        valorTotal,
        projects: projects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching company necesarios items:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener elementos necesarios' }, { status: 500 })
  }
}
