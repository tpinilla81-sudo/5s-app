import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')
    const source = searchParams.get('source')
    const estado = searchParams.get('estado')

    const where: any = {}
    if (sStep !== null) where.sStep = parseInt(sStep)
    if (projectId) where.projectId = projectId
    if (source) where.source = source
    if (estado) where.estado = estado

    const actions = await db.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: actions })
  } catch (error) {
    console.error('Error fetching actions:', error)
    return NextResponse.json({ success: false, error: 'Error fetching actions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sStep,
      miniStep,
      itemId,
      itemDescription,
      hallazgo,
      mejora,
      responsable,
      prioridad,
      estado,
      fechaLimite,
      source,
      projectId,
    } = body

    if (!hallazgo && !itemDescription) {
      return NextResponse.json({ success: false, error: 'Missing description' }, { status: 400 })
    }

    const action = await db.actionItem.create({
      data: {
        sStep: sStep || 0,
        miniStep: miniStep || 3,
        itemId: itemId || `ACT-${Date.now()}`,
        itemDescription: itemDescription || '',
        hallazgo: hallazgo || itemDescription || '',
        mejora: mejora || null,
        responsable: responsable || null,
        prioridad: prioridad || 'media',
        estado: estado || 'abierta',
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        source: source || 'actionplan',
        projectId: projectId || 'default',
      },
    })

    return NextResponse.json({ success: true, data: action })
  } catch (error) {
    console.error('Error creating action:', error)
    return NextResponse.json({ success: false, error: 'Error creating action' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing action ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.estado !== undefined) updateData.estado = body.estado
    if (body.prioridad !== undefined) updateData.prioridad = body.prioridad
    if (body.responsable !== undefined) updateData.responsable = body.responsable
    if (body.mejora !== undefined) updateData.mejora = body.mejora
    if (body.notas !== undefined) updateData.notas = body.notas
    if (body.fechaLimite !== undefined) updateData.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite) : null

    // If resolving, set resolution date
    if (body.estado === 'resuelta' || body.estado === 'cerrada') {
      updateData.fechaResolucion = new Date()
    }

    const action = await db.actionItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: action })
  } catch (error) {
    console.error('Error updating action:', error)
    return NextResponse.json({ success: false, error: 'Error updating action' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing action ID' }, { status: 400 })
    }

    await db.actionItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting action:', error)
    return NextResponse.json({ success: false, error: 'Error deleting action' }, { status: 500 })
  }
}
