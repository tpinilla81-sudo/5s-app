import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sStep: string; miniStep: string }> }
) {
  try {
    const { sStep, miniStep } = await params
    const progress = await db.progress.findUnique({
      where: { sStep_miniStep: { sStep: parseInt(sStep), miniStep: parseInt(miniStep) } },
    })
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
    const { completed, score, notes, photoUrls } = body

    const existing = await db.progress.findUnique({
      where: { sStep_miniStep: { sStep: parseInt(sStep), miniStep: parseInt(miniStep) } },
    })

    let result
    if (existing) {
      result = await db.progress.update({
        where: { sStep_miniStep: { sStep: parseInt(sStep), miniStep: parseInt(miniStep) } },
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
