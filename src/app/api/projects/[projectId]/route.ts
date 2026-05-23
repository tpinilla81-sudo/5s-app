import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/projects/[projectId] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { name, description, company, active } = body

    const existing = await db.project.findUnique({ where: { id: projectId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (company !== undefined) updateData.company = company.trim()
    if (active !== undefined) updateData.active = active

    const project = await db.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        zones: { orderBy: { createdAt: 'asc' } },
        _count: { select: { members: true } },
      },
    })

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        company: project.company,
        startDate: project.startDate,
        active: project.active,
        zones: project.zones,
        memberCount: project._count.members,
      },
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar proyecto' }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    const existing = await db.project.findUnique({ where: { id: projectId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Cascade delete will handle related records
    await db.project.delete({ where: { id: projectId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar proyecto' }, { status: 500 })
  }
}
