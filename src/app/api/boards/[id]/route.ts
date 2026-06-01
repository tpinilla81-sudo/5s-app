import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/boards/[id] - Get a single board with slots
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const board = await db.board.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            template: { select: { id: true, type: true, title: true, sStep: true, miniStep: true } },
            standard: { select: { id: true, title: true, sStep: true, category: true } },
          },
          orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
        },
        zones: { select: { id: true, name: true, projectId: true } },
      },
    })

    if (!board) {
      return NextResponse.json({ success: false, error: 'Tablero no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: board })
  } catch (error) {
    console.error('Error fetching board:', error)
    return NextResponse.json({ success: false, error: 'Error fetching board' }, { status: 500 })
  }
}

// PUT /api/boards/[id] - Update a board
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, isDefault, companyId } = body

    if (isDefault) {
      await db.board.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const board = await db.board.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
        ...(companyId !== undefined && { companyId: companyId || null }),
      },
    })

    return NextResponse.json({ success: true, data: board })
  } catch (error) {
    console.error('Error updating board:', error)
    return NextResponse.json({ success: false, error: 'Error updating board' }, { status: 500 })
  }
}

// DELETE /api/boards/[id] - Delete a board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const board = await db.board.findUnique({ where: { id } })
    if (!board) {
      return NextResponse.json({ success: false, error: 'Tablero no encontrado' }, { status: 404 })
    }
    if (board.isDefault) {
      return NextResponse.json({ success: false, error: 'No se puede eliminar el tablero por defecto' }, { status: 400 })
    }

    await db.zone.updateMany({
      where: { boardId: id },
      data: { boardId: null },
    })

    await db.board.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board:', error)
    return NextResponse.json({ success: false, error: 'Error deleting board' }, { status: 500 })
  }
}
