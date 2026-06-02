import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/photo-library/company-fotos
// Returns all photos across all projects of a given company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const photoType = searchParams.get('photoType')
    const category = searchParams.get('category')

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
      return NextResponse.json({ success: true, data: [], summary: { total: 0, bySStep: {}, byPhotoType: {} } })
    }

    const where: any = {
      projectId: { in: projectIds },
    }
    if (sStep) where.sStep = Number(sStep)
    if (miniStep) where.miniStep = Number(miniStep)
    if (photoType) where.photoType = photoType
    if (category) where.category = category

    const photos = await db.photoLibrary.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
      },
    })

    const parsed = photos.map(photo => ({
      ...photo,
      tags: photo.tags ? (typeof photo.tags === 'string' ? JSON.parse(photo.tags) : photo.tags) : null,
      projectName: photo.project?.name || '',
      zoneName: photo.zone?.name || '',
    }))

    // Summary by sStep and photoType
    const bySStep: Record<number, number> = {}
    const byPhotoType: Record<string, number> = {}

    for (const item of parsed) {
      bySStep[item.sStep] = (bySStep[item.sStep] || 0) + 1
      const pt = item.photoType || 'sin_tipo'
      byPhotoType[pt] = (byPhotoType[pt] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      summary: {
        total: parsed.length,
        bySStep,
        byPhotoType,
        projects: projects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching company photos:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener fotos de la empresa' }, { status: 500 })
  }
}
