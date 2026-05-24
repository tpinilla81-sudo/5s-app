import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'sStep is required' }, { status: 400 })
    }

    const where: any = { sStep: parseInt(sStep) }
    if (projectId) where.projectId = projectId

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse extra JSON field for each item
    const parsed = items.map(item => ({
      ...item,
      extra: item.extra ? JSON.parse(item.extra) : null,
    }))

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ success: false, error: 'Error fetching inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, projectId } = body

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Default categories per S step
    const defaultCategories: Record<number, string> = {
      1: 'dudoso',
      2: 'frecuente',
      3: 'polvo',
      4: 'visual',
      5: 'parcial',
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
          category: item.category || defaultCategories[sStep] || 'dudoso',
          quantity: item.quantity || 1,
          price: item.price != null ? parseFloat(String(item.price)) : null,
          action: item.action || null,
          photoUrl: item.photoUrl || null,
          extra: item.extra ? JSON.stringify(item.extra) : null,
          projectId: projectId || item.projectId || 'default',
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.location !== undefined) updateData.location = body.location
    if (body.category !== undefined) updateData.category = body.category
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.price !== undefined) updateData.price = body.price != null ? parseFloat(String(body.price)) : null
    if (body.action !== undefined) updateData.action = body.action
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl
    if (body.extra !== undefined) updateData.extra = body.extra ? JSON.stringify(body.extra) : null

    const result = await db.inventoryItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json({ success: false, error: 'Error updating inventory item' }, { status: 500 })
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
