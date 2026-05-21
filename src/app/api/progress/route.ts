import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const progress = await db.progress.findMany({
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
    })
    return NextResponse.json(progress)
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ error: 'Error fetching progress' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, completed, score, notes, photoUrls } = body

    if (!sStep || !miniStep) {
      return NextResponse.json({ error: 'sStep and miniStep are required' }, { status: 400 })
    }

    const existing = await db.progress.findUnique({
      where: { sStep_miniStep: { sStep, miniStep } },
    })

    let result
    if (existing) {
      result = await db.progress.update({
        where: { sStep_miniStep: { sStep, miniStep } },
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
          passedAt: completed ? new Date() : null,
        },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ error: 'Error updating progress' }, { status: 500 })
  }
}
