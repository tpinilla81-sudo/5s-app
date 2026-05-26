import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sStep = searchParams.get('sStep')
    const category = searchParams.get('category')
    const zoneId = searchParams.get('zoneId')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId es requerido' }, { status: 400 })
    }

    const where: any = { projectId }
    if (sStep) where.sStep = Number(sStep)
    if (category) where.category = category
    if (zoneId) where.zoneId = zoneId

    const standards = await db.standard.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { category: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: standards })
  } catch (error) {
    console.error('Error fetching standards:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener estándares' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, title, description, category, content, photoUrl, status, version, projectId, zoneId, createdBy } = body

    if (!sStep || !title || !projectId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios: sStep, title, projectId' }, { status: 400 })
    }

    const standard = await db.standard.create({
      data: {
        sStep: Number(sStep),
        title,
        description: description || null,
        category: category || 'general',
        content: content ? (typeof content === 'string' ? content : JSON.stringify(content)) : null,
        photoUrl: photoUrl || null,
        status: status || 'activo',
        version: version || 1,
        projectId,
        zoneId: zoneId || null,
        createdBy: createdBy || null,
      },
    })

    return NextResponse.json({ success: true, data: standard })
  } catch (error) {
    console.error('Error creating standard:', error)
    return NextResponse.json({ success: false, error: 'Error al crear estándar' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, sStep, title, description, category, content, photoUrl, status, version, zoneId } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id del estándar' }, { status: 400 })
    }

    const data: any = {}
    if (sStep !== undefined) data.sStep = Number(sStep)
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (category !== undefined) data.category = category
    if (content !== undefined) data.content = typeof content === 'string' ? content : JSON.stringify(content)
    if (photoUrl !== undefined) data.photoUrl = photoUrl
    if (status !== undefined) data.status = status
    if (version !== undefined) data.version = Number(version)
    if (zoneId !== undefined) data.zoneId = zoneId || null

    const standard = await db.standard.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: standard })
  } catch (error) {
    console.error('Error updating standard:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar estándar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id del estándar' }, { status: 400 })
    }

    await db.standard.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting standard:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar estándar' }, { status: 500 })
  }
}
