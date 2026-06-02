import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/board-configs — List all board configurations with slot counts
export async function GET() {
  try {
    const configs = await db.boardConfiguration.findMany({
      include: {
        _count: { select: { slots: true, zones: true } },
      },
      orderBy: { isDefault: 'desc' },
    })

    return NextResponse.json({ success: true, data: configs })
  } catch (error) {
    console.error('Error fetching board configs:', error)
    return NextResponse.json({ success: false, error: 'Error fetching board configs' }, { status: 500 })
  }
}

// POST /api/board-configs — Create a new board configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, isDefault } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await db.boardConfiguration.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const config = await db.boardConfiguration.create({
      data: {
        name,
        description: description || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Error creating board config:', error)
    return NextResponse.json({ success: false, error: 'Error creating board config' }, { status: 500 })
  }
}

// PUT /api/board-configs — Update a board configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, isDefault } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id' }, { status: 400 })
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await db.boardConfiguration.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const config = await db.boardConfiguration.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Error updating board config:', error)
    return NextResponse.json({ success: false, error: 'Error updating board config' }, { status: 500 })
  }
}

// DELETE /api/board-configs?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id' }, { status: 400 })
    }

    // Unlink zones from this config
    await db.zone.updateMany({
      where: { boardConfigId: id },
      data: { boardConfigId: null },
    })

    await db.boardConfiguration.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting board config:', error)
    return NextResponse.json({ success: false, error: 'Error deleting board config' }, { status: 500 })
  }
}
