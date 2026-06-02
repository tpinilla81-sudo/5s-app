import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/board-slots/[slotId]/standards - Add a standard to a slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params
    const body = await request.json()
    const { standardId } = body

    if (!standardId) {
      return NextResponse.json({ success: false, error: 'standardId es requerido' }, { status: 400 })
    }

    // Check if already exists
    const existing = await db.boardSlotStandard.findUnique({
      where: { slotId_standardId: { slotId, standardId } }
    })
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: 'Ya estaba asignado' })
    }

    // Get next sort order
    const count = await db.boardSlotStandard.count({ where: { slotId } })

    const slotStandard = await db.boardSlotStandard.create({
      data: { slotId, standardId, sortOrder: count },
      include: { standard: { select: { id: true, title: true, sStep: true, category: true } } },
    })

    return NextResponse.json({ success: true, data: slotStandard })
  } catch (error) {
    console.error('Error adding standard to slot:', error)
    return NextResponse.json({ success: false, error: 'Error adding standard' }, { status: 500 })
  }
}

// DELETE /api/board-slots/[slotId]/standards?standardId=xxx - Remove a standard from a slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params
    const { searchParams } = new URL(request.url)
    const standardId = searchParams.get('standardId')

    if (!standardId) {
      return NextResponse.json({ success: false, error: 'standardId es requerido' }, { status: 400 })
    }

    await db.boardSlotStandard.delete({
      where: { slotId_standardId: { slotId, standardId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing standard from slot:', error)
    return NextResponse.json({ success: false, error: 'Error removing standard' }, { status: 500 })
  }
}
