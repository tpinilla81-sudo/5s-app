import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/audit-targets?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    let targets = await db.auditTarget.findMany({
      where: { projectId },
      orderBy: { sStep: 'asc' },
    })

    // If no targets exist yet, create defaults
    if (targets.length === 0) {
      const defaults = [
        { sStep: 1, objetivo: 90, min: 80, max: 100 },
        { sStep: 2, objetivo: 80, min: 60, max: 100 },
        { sStep: 3, objetivo: 70, min: 50, max: 100 },
        { sStep: 4, objetivo: 70, min: 50, max: 100 },
        { sStep: 5, objetivo: 70, min: 50, max: 100 },
      ]

      for (const d of defaults) {
        await db.auditTarget.create({ data: { ...d, projectId } })
      }
      targets = await db.auditTarget.findMany({ where: { projectId }, orderBy: { sStep: 'asc' } })
    }

    return NextResponse.json({ success: true, data: targets })
  } catch (error) {
    console.error('Error fetching audit targets:', error)
    return NextResponse.json({ success: false, error: 'Error fetching audit targets' }, { status: 500 })
  }
}

// PUT /api/audit-targets - Update targets
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, targets } = body

    if (!projectId || !targets || !Array.isArray(targets)) {
      return NextResponse.json({ success: false, error: 'projectId and targets array required' }, { status: 400 })
    }

    const results = []
    for (const t of targets) {
      const result = await db.auditTarget.upsert({
        where: { projectId_sStep: { projectId, sStep: t.sStep } },
        update: { objetivo: t.objetivo, min: t.min, max: t.max },
        create: { projectId, sStep: t.sStep, objetivo: t.objetivo, min: t.min, max: t.max },
      })
      results.push(result)
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Error updating audit targets:', error)
    return NextResponse.json({ success: false, error: 'Error updating audit targets' }, { status: 500 })
  }
}
