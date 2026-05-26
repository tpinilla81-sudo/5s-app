import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId

    const progress = await db.progress.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
    })
    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ success: false, error: 'Error fetching progress' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, completed, score, notes, photoUrls, projectId, zoneId } = body

    if (!sStep || !miniStep) {
      return NextResponse.json({ success: false, error: 'sStep and miniStep are required' }, { status: 400 })
    }

    // Use projectId in the lookup
    const lookupProjectId = projectId
    if (!lookupProjectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }

    // Build where clause - include zoneId if provided
    const findWhere: any = {
      sStep,
      miniStep,
      projectId: lookupProjectId,
    }
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
          sStep,
          miniStep,
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
