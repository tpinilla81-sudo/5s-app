import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const sStep = searchParams.get('sStep')

    const where: Record<string, unknown> = { active: true }
    if (type) where.type = type
    if (sStep) where.sStep = parseInt(sStep)

    const templates = await db.template.findMany({ where })
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ success: false, error: 'Error fetching templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, sStep, title, description, content } = body

    if (!type || !sStep || !title || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const template = await db.template.create({
      data: { type, sStep, title, description, content: typeof content === 'string' ? content : JSON.stringify(content) },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ success: false, error: 'Error creating template' }, { status: 500 })
  }
}
