import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sStep: string; miniStep: string }> }
) {
  try {
    const { sStep, miniStep } = await params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    const where: any = { sStep: parseInt(sStep), miniStep: parseInt(miniStep) }
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId
    else if (projectId) where.zoneId = null

    const progress = await db.progress.findFirst({ where })
    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ success: false, error: 'Error fetching progress' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sStep: string; miniStep: string }> }
) {
  try {
    const { sStep, miniStep } = await params
    const body = await request.json()
    const { completed, score, notes, photoUrls, projectId, zoneId } = body

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    const findWhere: any = {
      sStep: parseInt(sStep),
      miniStep: parseInt(miniStep),
      projectId,
    }
    if (zoneId) {
      findWhere.zoneId = zoneId
    } else {
      findWhere.zoneId = null
    }

    const existing = await db.progress.findFirst({ where: findWhere })

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
          projectId,
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
