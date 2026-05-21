import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'sStep is required' }, { status: 400 })
    }

    const items = await db.inventoryItem.findMany({
      where: { sStep: parseInt(sStep) },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ success: false, error: 'Error fetching inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep } = body

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Support both single item and array of items
    const items = body.items || [body]
    const created = []

    for (const item of items) {
      if (!item.name) continue
      const result = await db.inventoryItem.create({
        data: {
          sStep,
          name: item.name,
          location: item.location || null,
          category: item.category || 'dudoso',
          quantity: item.quantity || 1,
          action: item.action || null,
          photoUrl: item.photoUrl || null,
        },
      })
      created.push(result)
    }

    return NextResponse.json({ success: true, data: created.length === 1 ? created[0] : created })
  } catch (error) {
    console.error('Error creating inventory items:', error)
    return NextResponse.json({ success: false, error: 'Error creating inventory items' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    await db.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json({ success: false, error: 'Error deleting inventory item' }, { status: 500 })
  }
}
