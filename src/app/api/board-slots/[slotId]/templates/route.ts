import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/board-slots/[slotId]/templates - Add a template to a slot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params
    const body = await request.json()
    const { templateId } = body

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'templateId es requerido' }, { status: 400 })
    }

    // Check if already exists
    const existing = await db.boardSlotTemplate.findUnique({
      where: { slotId_templateId: { slotId, templateId } }
    })
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: 'Ya estaba asignada' })
    }

    // Get next sort order
    const count = await db.boardSlotTemplate.count({ where: { slotId } })

    const slotTemplate = await db.boardSlotTemplate.create({
      data: { slotId, templateId, sortOrder: count },
      include: { template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } } },
    })

    return NextResponse.json({ success: true, data: slotTemplate })
  } catch (error) {
    console.error('Error adding template to slot:', error)
    return NextResponse.json({ success: false, error: 'Error adding template' }, { status: 500 })
  }
}

// DELETE /api/board-slots/[slotId]/templates?templateId=xxx - Remove a template from a slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'templateId es requerido' }, { status: 400 })
    }

    await db.boardSlotTemplate.delete({
      where: { slotId_templateId: { slotId, templateId } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing template from slot:', error)
    return NextResponse.json({ success: false, error: 'Error removing template' }, { status: 500 })
  }
}
