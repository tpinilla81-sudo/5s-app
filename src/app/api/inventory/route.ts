import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')

    if (!sStep) {
      return NextResponse.json({ error: 'sStep is required' }, { status: 400 })
    }

    const items = await db.inventoryItem.findMany({
      where: { sStep: parseInt(sStep) },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ error: 'Error fetching inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, items } = body

    if (!sStep || !items) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const created = []
    for (const item of items) {
      const result = await db.inventoryItem.create({
        data: {
          sStep,
          name: item.name,
          location: item.location || null,
          category: item.category,
          quantity: item.quantity || 1,
          action: item.action || null,
          photoUrl: item.photoUrl || null,
        },
      })
      created.push(result)
    }

    // Check if enough items classified to pass (min 80% classified)
    const totalItems = await db.inventoryItem.count({ where: { sStep } })
    const classifiedItems = await db.inventoryItem.count({
      where: { sStep, category: { in: ['util', 'innecesario'] } },
    })
    const classificationRate = totalItems > 0 ? (classifiedItems / totalItems) * 100 : 0

    if (classificationRate >= 80 && totalItems >= 5) {
      const existing = await db.progress.findUnique({
        where: { sStep_miniStep: { sStep, miniStep: 3 } },
      })
      if (existing) {
        await db.progress.update({
          where: { sStep_miniStep: { sStep, miniStep: 3 } },
          data: { completed: true, score: classificationRate, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep, miniStep: 3, completed: true, score: classificationRate, passedAt: new Date() },
        })
      }
    }

    return NextResponse.json({ items: created, classificationRate, passed: classificationRate >= 80 && totalItems >= 5 })
  } catch (error) {
    console.error('Error creating inventory items:', error)
    return NextResponse.json({ error: 'Error creating inventory items' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json({ error: 'Error deleting inventory item' }, { status: 500 })
  }
}
