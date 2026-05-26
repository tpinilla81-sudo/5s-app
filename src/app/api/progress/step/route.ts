import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/progress/step?sStep=1&miniStep=2&projectId=xxx&zoneId=yyy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    if (!sStep || !miniStep) {
      return NextResponse.json({ success: false, error: 'sStep and miniStep are required' }, { status: 400 })
    }

    const where: any = { sStep: parseInt(sStep), miniStep: parseInt(miniStep) }
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId

    const progress = await db.progress.findFirst({
      where,
    })
    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ success: false, error: 'Error fetching progress' }, { status: 500 })
  }
}

// PUT /api/progress/step?sStep=1&miniStep=2
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')

    if (!sStep || !miniStep) {
      return NextResponse.json({ success: false, error: 'sStep and miniStep are required' }, { status: 400 })
    }

    const body = await request.json()
    const { completed, score, notes, photoUrls, projectId, zoneId } = body

    const lookupProjectId = projectId
    if (!lookupProjectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }

    // Build the where clause for finding existing record
    const findWhere: any = {
      sStep: parseInt(sStep),
      miniStep: parseInt(miniStep),
      projectId: lookupProjectId,
    }
    // If zoneId is provided, use it; otherwise look for project-level (zoneId is null)
    if (zoneId) {
      findWhere.zoneId = zoneId
    } else {
      findWhere.zoneId = null
    }

    const existing = await db.progress.findFirst({
      where: findWhere,
    })

    let result
    if (existing) {
      result = await db.progress.update({
        where: { id: existing.id },
        data: {
          completed: completed ?? existing.completed,
          score: score ?? existing.score,
          notes: notes ?? existing.notes,
          photoUrls: photoUrls ?? existing.photoUrls,
          passedAt: completed && !existing.completed ? new Date() : existing.passedAt,
        },
      })
    } else {
      result = await db.progress.create({
        data: {
          sStep: parseInt(sStep),
          miniStep: parseInt(miniStep),
          completed: completed ?? false,
          score,
          notes,
          photoUrls,
          projectId: lookupProjectId,
          zoneId: zoneId || null,
          passedAt: completed ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ success: false, error: 'Error updating progress' }, { status: 500 })
  }
}
