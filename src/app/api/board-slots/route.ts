import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/board-slots?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || undefined

    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    else where.projectId = null

    const slots = await db.boardSlot.findMany({
      where,
      include: {
        template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } },
        standard: { select: { id: true, title: true, sStep: true, category: true } },
      },
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
    })

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    console.error('Error fetching board slots:', error)
    return NextResponse.json({ success: false, error: 'Error fetching board slots' }, { status: 500 })
  }
}

// POST /api/board-slots - Create or update (upsert) a board slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, templateId, standardId, projectId } = body

    if (sStep == null || miniStep == null) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios: sStep, miniStep' }, { status: 400 })
    }

    const slot = await db.boardSlot.upsert({
      where: {
        sStep_miniStep_projectId: {
          sStep: Number(sStep),
          miniStep: Number(miniStep),
          projectId: projectId || null,
        },
      },
      create: {
        sStep: Number(sStep),
        miniStep: Number(miniStep),
        templateId: templateId || null,
        standardId: standardId || null,
        projectId: projectId || null,
      },
      update: {
        templateId: templateId || null,
        standardId: standardId || null,
      },
      include: {
        template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } },
        standard: { select: { id: true, title: true, sStep: true, category: true } },
      },
    })

    return NextResponse.json({ success: true, data: slot })
  } catch (error) {
    console.error('Error upserting board slot:', error)
    return NextResponse.json({ success: false, error: 'Error upserting board slot' }, { status: 500 })
  }
}

// DELETE /api/board-slots?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id' }, { status: 400 })
    }

    await db.boardSlot.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board slot:', error)
    return NextResponse.json({ success: false, error: 'Error deleting board slot' }, { status: 500 })
  }
}
