import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const photoType = searchParams.get('photoType')
    const category = searchParams.get('category')
    const zoneId = searchParams.get('zoneId')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId es requerido' }, { status: 400 })
    }

    const where: any = { projectId }
    if (sStep) where.sStep = Number(sStep)
    if (miniStep) where.miniStep = Number(miniStep)
    if (photoType) where.photoType = photoType
    if (category) where.category = category
    if (zoneId) where.zoneId = zoneId

    const photos = await db.photoLibrary.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, data: photos })
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener fotos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, title, description, photoUrl, photoType, category, tags, projectId, zoneId, uploadedBy } = body

    if (!sStep || !title || !photoUrl || !projectId) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios: sStep, title, photoUrl, projectId' }, { status: 400 })
    }

    const photo = await db.photoLibrary.create({
      data: {
        sStep: Number(sStep),
        miniStep: miniStep || 2,
        title,
        description: description || null,
        photoUrl,
        photoType: photoType || 'antes',
        category: category || 'general',
        tags: tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null,
        projectId,
        zoneId: zoneId || null,
        uploadedBy: uploadedBy || null,
      },
    })

    return NextResponse.json({ success: true, data: photo })
  } catch (error) {
    console.error('Error creating photo:', error)
    return NextResponse.json({ success: false, error: 'Error al registrar foto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, sStep, miniStep, title, description, photoUrl, photoType, category, tags, zoneId } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id de la foto' }, { status: 400 })
    }

    const data: any = {}
    if (sStep !== undefined) data.sStep = Number(sStep)
    if (miniStep !== undefined) data.miniStep = Number(miniStep)
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (photoUrl !== undefined) data.photoUrl = photoUrl
    if (photoType !== undefined) data.photoType = photoType
    if (category !== undefined) data.category = category
    if (tags !== undefined) data.tags = typeof tags === 'string' ? tags : JSON.stringify(tags)
    if (zoneId !== undefined) data.zoneId = zoneId || null

    const photo = await db.photoLibrary.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: photo })
  } catch (error) {
    console.error('Error updating photo:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar foto' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id de la foto' }, { status: 400 })
    }

    await db.photoLibrary.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar foto' }, { status: 500 })
  }
}
