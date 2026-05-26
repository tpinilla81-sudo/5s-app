import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')
    const jaulaOnly = searchParams.get('jaulaOnly')
    const zoneId = searchParams.get('zoneId')

    // TASK 3: Global jaula view - return all jaula items across all projects
    if (jaulaOnly === 'true') {
      const where: any = {
        jaulaStatus: { not: '' },
      }
      if (sStep) where.sStep = parseInt(sStep)
      if (projectId) where.projectId = projectId
      if (zoneId) where.zoneId = zoneId

      const items = await db.inventoryItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, name: true, company: true },
          },
        },
      })

      const parsed = items.map(item => ({
        ...item,
        extra: item.extra ? JSON.parse(item.extra) : null,
      }))

      return NextResponse.json({ success: true, data: parsed })
    }

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'sStep is required' }, { status: 400 })
    }

    const where: any = { sStep: parseInt(sStep) }
    if (projectId && projectId !== 'undefined') where.projectId = projectId
    if (zoneId && zoneId !== 'undefined') where.zoneId = zoneId

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        zone: { select: { id: true, name: true } },
      },
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
    const { sStep, projectId, zoneId } = body

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

    // Validate projectId exists
    const effectiveProjectId = projectId || (body.items && body.items[0]?.projectId)
    if (!effectiveProjectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }

    // Verify project exists in database
    const projectExists = await db.project.findUnique({ where: { id: effectiveProjectId } })
    if (!projectExists) {
      return NextResponse.json({ success: false, error: `Project with id '${effectiveProjectId}' not found` }, { status: 400 })
    }

    // Support both single item and array of items
    const items = body.items || [body]
    const created: any[] = []

    for (const item of items) {
      if (!item.name) continue
      const result = await db.inventoryItem.create({
        data: {
          sStep,
          name: item.name,
          location: item.location || null,
          category: item.category || defaultCategories[sStep] || 'dudoso',
          quantity: item.quantity || 1,
          quantityNeeded: item.quantityNeeded || 0,
          quantityUnneeded: item.quantityUnneeded || 0,
          price: item.price != null ? parseFloat(String(item.price)) : null,
          action: item.action || null,
          photoUrl: item.photoUrl || null,
          extra: item.extra ? JSON.stringify(item.extra) : null,
          jaulaStatus: item.jaulaStatus || '',
          jaulaFechaEntrada: item.jaulaFechaEntrada || null,
          jaulaOrigen: item.jaulaOrigen || null,
          jaulaFechaSalida: item.jaulaFechaSalida || null,
          jaulaDestino: item.jaulaDestino || null,
          zonaOrigen: item.zonaOrigen || null,
          zonaDestino: item.zonaDestino || null,
          projectId: effectiveProjectId,
          zoneId: item.zoneId || zoneId || null,
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
    // Read id from URL query params (client sends it in the URL)
    const { searchParams } = new URL(request.url)
    const idFromUrl = searchParams.get('id')
    const body = await request.json()
    const id = idFromUrl || body.id

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.location !== undefined) updateData.location = body.location
    if (body.category !== undefined) updateData.category = body.category
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.quantityNeeded !== undefined) updateData.quantityNeeded = body.quantityNeeded
    if (body.quantityUnneeded !== undefined) updateData.quantityUnneeded = body.quantityUnneeded
    if (body.price !== undefined) updateData.price = body.price != null ? parseFloat(String(body.price)) : null
    if (body.action !== undefined) updateData.action = body.action
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl
    if (body.extra !== undefined) updateData.extra = body.extra ? JSON.stringify(body.extra) : null
    if (body.jaulaStatus !== undefined) updateData.jaulaStatus = body.jaulaStatus
    if (body.jaulaFechaEntrada !== undefined) updateData.jaulaFechaEntrada = body.jaulaFechaEntrada
    if (body.jaulaOrigen !== undefined) updateData.jaulaOrigen = body.jaulaOrigen
    if (body.jaulaFechaSalida !== undefined) updateData.jaulaFechaSalida = body.jaulaFechaSalida
    if (body.jaulaDestino !== undefined) updateData.jaulaDestino = body.jaulaDestino
    if (body.zoneId !== undefined) updateData.zoneId = body.zoneId
    if (body.zonaOrigen !== undefined) updateData.zonaOrigen = body.zonaOrigen
    if (body.zonaDestino !== undefined) updateData.zonaDestino = body.zonaDestino

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
