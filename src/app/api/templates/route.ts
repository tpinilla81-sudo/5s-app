import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/templates?type=xxx&sStep=1&miniStep=3&includeInactive=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.active = true
    if (type) where.type = type
    if (sStep) where.sStep = parseInt(sStep)
    if (miniStep) where.miniStep = parseInt(miniStep)

    const templates = await db.template.findMany({ where, orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }, { createdAt: 'desc' }] })
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ success: false, error: 'Error fetching templates' }, { status: 500 })
  }
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, sStep, miniStep, title, description, content, notaMinima, projectId } = body

    if (!type || sStep == null || !title || !content) {
      return NextResponse.json({ success: false, error: 'Faltan campos obligatorios: type, sStep, title, content' }, { status: 400 })
    }

    const data: Record<string, unknown> = {
      type,
      sStep: Number(sStep),
      miniStep: miniStep != null ? Number(miniStep) : 3,
      title,
      description: description || null,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      notaMinima: notaMinima != null ? Number(notaMinima) : null,
    }

    const template = await db.template.create({ data })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ success: false, error: 'Error creating template' }, { status: 500 })
  }
}

// PUT /api/templates - Update template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, sStep, miniStep, title, description, content, active, notaMinima } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id de la plantilla' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (type !== undefined) data.type = type
    if (sStep !== undefined) data.sStep = Number(sStep)
    if (miniStep !== undefined) data.miniStep = Number(miniStep)
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (content !== undefined) data.content = typeof content === 'string' ? content : JSON.stringify(content)
    if (active !== undefined) data.active = Boolean(active)
    if (notaMinima !== undefined) data.notaMinima = notaMinima != null ? Number(notaMinima) : null

    const template = await db.template.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ success: false, error: 'Error updating template' }, { status: 500 })
  }
}

// DELETE /api/templates?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Se requiere el id' }, { status: 400 })
    }

    await db.template.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ success: false, error: 'Error deleting template' }, { status: 500 })
  }
}
