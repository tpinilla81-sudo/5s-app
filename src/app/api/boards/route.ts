import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/boards?companyId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || undefined

    const where: Record<string, unknown> = {}
    if (companyId) {
      where.OR = [
        { companyId },
        { companyId: null }, // Include global boards
      ]
    }

    const boards = await db.board.findMany({
      where,
      include: {
        slots: {
          include: {
            template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } },
            standard: { select: { id: true, title: true, sStep: true, category: true } },
          },
          orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
        },
        _count: { select: { zones: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: boards })
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json({ success: false, error: 'Error fetching boards' }, { status: 500 })
  }
}

// POST /api/boards - Create a new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, isDefault, companyId, copyFromBoardId } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // If this is set as default, unset any other default
    if (isDefault) {
      await db.board.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const board = await db.board.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault || false,
        companyId: companyId || null,
      },
    })

    // If copying from another board, clone all slots
    if (copyFromBoardId) {
      const sourceSlots = await db.boardSlot.findMany({
        where: { boardId: copyFromBoardId },
      })
      if (sourceSlots.length > 0) {
        await db.boardSlot.createMany({
          data: sourceSlots.map(slot => ({
            sStep: slot.sStep,
            miniStep: slot.miniStep,
            templateId: slot.templateId,
            standardId: slot.standardId,
            boardId: board.id,
          })),
        })
      }
    }

    // Fetch the complete board with slots
    const fullBoard = await db.board.findUnique({
      where: { id: board.id },
      include: {
        slots: {
          include: {
            template: { select: { id: true, type: true, title: true } },
            standard: { select: { id: true, title: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: fullBoard })
  } catch (error) {
    console.error('Error creating board:', error)
    return NextResponse.json({ success: false, error: 'Error creating board' }, { status: 500 })
  }
}
