import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/projects/[projectId]/zones - List zones of a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    const zones = await db.zone.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { memberZones: true },
        },
        boardConfig: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const result = zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      description: zone.description,
      color: zone.color,
      projectId: zone.projectId,
      boardConfigId: zone.boardConfigId,
      boardConfig: zone.boardConfig,
      memberCount: zone._count.memberZones,
    }))

    return NextResponse.json({ zones: result }, { status: 200 })
  } catch (error) {
    console.error('Fetch zones error:', error)
    return NextResponse.json(
      { error: 'Error al obtener zonas' },
      { status: 500 }
    )
  }
}

// POST /api/projects/[projectId]/zones - Add a zone to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { name, description, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nombre de zona es requerido' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Check for duplicate zone name in project
    const existingZone = await db.zone.findUnique({
      where: {
        name_projectId: {
          name: name.trim(),
          projectId,
        },
      },
    })

    if (existingZone) {
      return NextResponse.json(
        { error: 'Ya existe una zona con este nombre en el proyecto' },
        { status: 409 }
      )
    }

    const zone = await db.zone.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
        projectId,
      },
    })

    return NextResponse.json({ zone }, { status: 201 })
  } catch (error) {
    console.error('Add zone error:', error)
    return NextResponse.json(
      { error: 'Error al agregar zona' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[projectId]/zones - Update a zone's board config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { zoneId, boardConfigId } = body

    if (!zoneId) {
      return NextResponse.json(
        { error: 'ID de zona es requerido' },
        { status: 400 }
      )
    }

    const zone = await db.zone.update({
      where: { id: zoneId },
      data: { boardConfigId: boardConfigId || null },
      include: {
        boardConfig: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ zone }, { status: 200 })
  } catch (error) {
    console.error('Update zone error:', error)
    return NextResponse.json(
      { error: 'Error al actualizar zona' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[projectId]/zones - Remove a zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { zoneId } = body

    if (!zoneId) {
      return NextResponse.json(
        { error: 'ID de zona es requerido' },
        { status: 400 }
      )
    }

    // Verify zone belongs to project
    const zone = await db.zone.findUnique({
      where: { id: zoneId },
    })

    if (!zone || zone.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Zona no encontrada en este proyecto' },
        { status: 404 }
      )
    }

    // Delete zone (cascade will handle member zone references)
    await db.zone.delete({
      where: { id: zoneId },
    })

    return NextResponse.json(
      { message: 'Zona eliminada correctamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete zone error:', error)
    return NextResponse.json(
      { error: 'Error al eliminar zona' },
      { status: 500 }
    )
  }
}
