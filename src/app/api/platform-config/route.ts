import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/platform-config - Get all platform config
export async function GET() {
  try {
    const configs = await db.platformConfig.findMany({
      orderBy: { key: 'asc' },
    })
    return NextResponse.json({ success: true, configs })
  } catch (error) {
    console.error('Error fetching platform config:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// POST /api/platform-config - Create or update a config entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key y value son requeridos' }, { status: 400 })
    }

    const config = await db.platformConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error saving platform config:', error)
    return NextResponse.json({ success: false, error: 'Error al guardar configuración' }, { status: 500 })
  }
}

// PUT /api/platform-config - Update a config entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Key y value son requeridos' }, { status: 400 })
    }

    const existing = await db.platformConfig.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Config no encontrada' }, { status: 404 })
    }

    const config = await db.platformConfig.update({
      where: { key },
      data: { value },
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error updating platform config:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar configuración' }, { status: 500 })
  }
}

// DELETE /api/platform-config - Delete a config entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key es requerido' }, { status: 400 })
    }

    await db.platformConfig.delete({ where: { key } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting platform config:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar configuración' }, { status: 500 })
  }
}
