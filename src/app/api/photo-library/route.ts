import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const photoType = searchParams.get('photoType')
    const category = searchParams.get('category')
    const zoneId = searchParams.get('zoneId')
    const inventoryItemId = searchParams.get('inventoryItemId')

    if (!projectId && !inventoryItemId) {
      return NextResponse.json({ success: false, error: 'projectId o inventoryItemId es requerido' }, { status: 400 })
    }

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (sStep) where.sStep = Number(sStep)
    if (miniStep) where.miniStep = Number(miniStep)
    if (photoType) where.photoType = photoType
    if (category) where.category = category
    if (zoneId) where.zoneId = zoneId
    if (inventoryItemId) where.inventoryItemId = inventoryItemId

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
    const { sStep, miniStep, title, description, photoUrl, photoType, category, tags, projectId, zoneId, uploadedBy, inventoryItemId } = body

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
        inventoryItemId: inventoryItemId || null,
      },
    })

    // If the photo is linked to an inventory item, update the inventory item's photoUrls JSON field
    if (inventoryItemId) {
      try {
        const inventoryItem = await db.inventoryItem.findUnique({ where: { id: inventoryItemId } })
        if (inventoryItem) {
          const existingPhotoUrls = inventoryItem.photoUrls ? JSON.parse(inventoryItem.photoUrls) : []
          const newEntry = {
            url: photoUrl,
            type: photoType || 'antes',
            caption: title,
          }
          existingPhotoUrls.push(newEntry)
          await db.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { photoUrls: JSON.stringify(existingPhotoUrls) },
          })
        }
      } catch (updateError) {
        console.error('Error updating inventory item photoUrls:', updateError)
        // Non-critical: the photo was still created, just the denormalized field failed
      }
    }

    return NextResponse.json({ success: true, data: photo })
  } catch (error) {
    console.error('Error creating photo:', error)
    return NextResponse.json({ success: false, error: 'Error al registrar foto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, sStep, miniStep, title, description, photoUrl, photoType, category, tags, zoneId, inventoryItemId } = body

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
    if (inventoryItemId !== undefined) data.inventoryItemId = inventoryItemId || null

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

    // Before deleting, if the photo is linked to an inventory item, update photoUrls
    const photo = await db.photoLibrary.findUnique({ where: { id } })
    if (photo?.inventoryItemId) {
      try {
        const inventoryItem = await db.inventoryItem.findUnique({ where: { id: photo.inventoryItemId } })
        if (inventoryItem?.photoUrls) {
          const existingPhotoUrls = JSON.parse(inventoryItem.photoUrls)
          const updatedPhotoUrls = existingPhotoUrls.filter(
            (entry: any) => entry.url !== photo.photoUrl
          )
          await db.inventoryItem.update({
            where: { id: photo.inventoryItemId },
            data: { photoUrls: updatedPhotoUrls.length > 0 ? JSON.stringify(updatedPhotoUrls) : null },
          })
        }
      } catch (updateError) {
        console.error('Error updating inventory item photoUrls on photo delete:', updateError)
        // Non-critical: proceed with deletion
      }
    }

    await db.photoLibrary.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar foto' }, { status: 500 })
  }
}
