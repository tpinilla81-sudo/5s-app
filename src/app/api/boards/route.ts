import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const slotInclude = {
  templates: {
    include: { template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } } },
    orderBy: { sortOrder: 'asc' },
  },
  standards: {
    include: { standard: { select: { id: true, title: true, sStep: true, category: true } } },
    orderBy: { sortOrder: 'asc' },
  },
}

// GET /api/boards?companyId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || undefined

    // BoardConfiguration doesn't have companyId in current schema, fetch all
    const boards = await db.boardConfiguration.findMany({
      include: {
        slots: {
          include: slotInclude,
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
    const { name, description, isDefault, copyFromBoardId } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // If this is set as default, unset any other default
    if (isDefault) {
      await db.boardConfiguration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const board = await db.boardConfiguration.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: isDefault || false,
      },
    })

    // If copying from another board, clone all slots including junction tables
    if (copyFromBoardId) {
      const sourceSlots = await db.boardSlot.findMany({
        where: { boardConfigId: copyFromBoardId },
        include: {
          templates: true,
          standards: true,
        },
      })
      if (sourceSlots.length > 0) {
        for (const slot of sourceSlots) {
          const newSlot = await db.boardSlot.create({
            data: {
              sStep: slot.sStep,
              miniStep: slot.miniStep,
              boardConfigId: board.id,
            },
          })
          // Clone junction tables
          if (slot.templates.length > 0) {
            await db.boardSlotTemplate.createMany({
              data: slot.templates.map(st => ({
                slotId: newSlot.id,
                templateId: st.templateId,
                sortOrder: st.sortOrder,
              })),
            })
          }
          if (slot.standards.length > 0) {
            await db.boardSlotStandard.createMany({
              data: slot.standards.map(ss => ({
                slotId: newSlot.id,
                standardId: ss.standardId,
                sortOrder: ss.sortOrder,
              })),
            })
          }
        }
      }
    }

    // Fetch the complete board with slots
    const fullBoard = await db.boardConfiguration.findUnique({
      where: { id: board.id },
      include: {
        slots: {
          include: slotInclude,
        },
      },
    })

    return NextResponse.json({ success: true, data: fullBoard })
  } catch (error) {
    console.error('Error creating board:', error)
    return NextResponse.json({ success: false, error: 'Error creating board' }, { status: 500 })
  }
}
