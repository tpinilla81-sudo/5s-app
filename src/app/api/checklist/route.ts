import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const projectId = searchParams.get('projectId')
    if (!sStep) return NextResponse.json({ success: false, error: 'sStep is required' }, { status: 400 })
    if (!projectId) return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    const where: Record<string, unknown> = { sStep: parseInt(sStep), projectId }
    if (miniStep) where.miniStep = parseInt(miniStep)
    const responses = await db.checklistResponse.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: responses })
  } catch (error) {
    console.error('Error fetching checklist:', error)
    return NextResponse.json({ success: false, error: 'Error fetching checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, results, score, observaciones, auditor, projectId } = body
    if (!sStep || !miniStep || !results || score === undefined || !projectId) {
      return NextResponse.json({ success: false, error: 'sStep, miniStep, results, score and projectId are required' }, { status: 400 })
    }
    const response = await db.checklistResponse.create({
      data: {
        sStep, miniStep, projectId,
        results: typeof results === 'string' ? results : JSON.stringify(results),
        score,
        observaciones: observaciones || null,
        auditor: auditor || null,
      },
    })
    const resultsObj = typeof results === 'string' ? JSON.parse(results) : results
    const nokItems = Object.values(resultsObj).filter(
      (item: unknown) => (item as Record<string, unknown>)?.status === 'nok'
    ) as Array<{ itemId: string; hallazgo?: string; mejora?: string; otherText?: string; photoRefs?: string }>
    for (const nok of nokItems) {
      if (!nok.hallazgo && !nok.mejora) continue
      const existing = await db.actionItem.findFirst({
        where: { sStep, itemId: nok.itemId, projectId, estado: { in: ['abierta', 'en_proceso'] } },
      })
      if (existing) {
        await db.actionItem.update({
          where: { id: existing.id },
          data: {
            hallazgo: nok.hallazgo || existing.hallazgo,
            mejora: nok.mejora || existing.mejora,
            miniStep,
            source: miniStep === 4 ? 'autoevaluacion' : 'auditoria',
            auditor: auditor || null,
            photoRefs: nok.photoRefs || existing.photoRefs,
            updatedAt: new Date(),
          },
        })
      } else {
        await db.actionItem.create({
          data: {
            sStep, miniStep, projectId,
            itemId: nok.itemId,
            itemDescription: nok.itemId,
            hallazgo: nok.hallazgo || 'Sin descripción de hallazgo',
            mejora: nok.mejora || null,
            source: miniStep === 4 ? 'autoevaluacion' : 'auditoria',
            auditor: auditor || null,
            photoRefs: nok.photoRefs || null,
          },
        })
      }
    }
    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Error saving checklist:', error)
    return NextResponse.json({ success: false, error: 'Error saving checklist' }, { status: 500 })
  }
}
