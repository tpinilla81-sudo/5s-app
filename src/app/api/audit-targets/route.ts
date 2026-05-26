import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/audit-targets?projectId=xxx&zoneId=yyy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId required' }, { status: 400 })
    }

    let targets = await db.auditTarget.findMany({
      where: {
        projectId,
        ...(zoneId ? { zoneId } : {}),
      },
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
    })

    // If no targets exist yet, create defaults for all S steps × both miniSteps (project-level)
    if (targets.length === 0) {
      const defaults: Array<{ sStep: number; miniStep: number; notaMinima: number; objetivo: number }> = []

      for (let sStep = 1; sStep <= 5; sStep++) {
        // MiniStep 4 (Autoevaluación)
        defaults.push({ sStep, miniStep: 4, notaMinima: 70, objetivo: 80 })
        // MiniStep 5 (Auditoría)
        defaults.push({ sStep, miniStep: 5, notaMinima: 75, objetivo: 85 })
      }

      for (const d of defaults) {
        await db.auditTarget.create({
          data: {
            projectId,
            sStep: d.sStep,
            miniStep: d.miniStep,
            notaMinima: d.notaMinima,
            objetivo: d.objetivo,
            zoneId: null, // project-level default
          },
        })
      }

      targets = await db.auditTarget.findMany({
        where: {
          projectId,
          ...(zoneId ? { zoneId } : {}),
        },
        orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
      })
    } else if (!zoneId) {
      // We have some targets but might be missing miniStep 5 (old data)
      // Ensure all 10 targets exist (5 S-steps × 2 miniSteps)
      const existingKeys = new Set(targets.map(t => `${t.sStep}-${t.miniStep}-${t.zoneId}`))
      const missing: Array<{ sStep: number; miniStep: number; notaMinima: number; objetivo: number }> = []

      for (let sStep = 1; sStep <= 5; sStep++) {
        for (const miniStep of [4, 5]) {
          if (!existingKeys.has(`${sStep}-${miniStep}-null`) && !existingKeys.has(`${sStep}-${miniStep}-undefined`)) {
            missing.push({
              sStep,
              miniStep,
              notaMinima: miniStep === 4 ? 70 : 75,
              objetivo: miniStep === 4 ? 80 : 85,
            })
          }
        }
      }

      for (const d of missing) {
        const created = await db.auditTarget.create({
          data: {
            projectId,
            sStep: d.sStep,
            miniStep: d.miniStep,
            notaMinima: d.notaMinima,
            objetivo: d.objetivo,
            zoneId: null,
          },
        })
        targets.push(created)
      }

      // Re-sort
      targets.sort((a, b) => a.sStep - b.sStep || a.miniStep - b.miniStep)
    }

    return NextResponse.json({ success: true, data: targets })
  } catch (error) {
    console.error('Error fetching audit targets:', error)
    return NextResponse.json({ success: false, error: 'Error fetching audit targets' }, { status: 500 })
  }
}

// PUT /api/audit-targets - Upsert targets using findFirst + create/update
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, targets } = body

    if (!projectId || !targets || !Array.isArray(targets)) {
      return NextResponse.json({ success: false, error: 'projectId and targets array required' }, { status: 400 })
    }

    const results = []
    for (const t of targets) {
      const zoneId = t.zoneId ?? null

      // Find existing target by composite fields (handles null zoneId correctly)
      const existing = await db.auditTarget.findFirst({
        where: {
          projectId,
          sStep: t.sStep,
          miniStep: t.miniStep,
          ...(zoneId ? { zoneId } : { zoneId: null }),
        },
      })

      let result
      if (existing) {
        result = await db.auditTarget.update({
          where: { id: existing.id },
          data: {
            notaMinima: t.notaMinima,
            objetivo: t.objetivo,
          },
        })
      } else {
        result = await db.auditTarget.create({
          data: {
            projectId,
            sStep: t.sStep,
            miniStep: t.miniStep,
            zoneId,
            notaMinima: t.notaMinima,
            objetivo: t.objetivo,
          },
        })
      }
      results.push(result)
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Error updating audit targets:', error)
    return NextResponse.json({ success: false, error: 'Error updating audit targets' }, { status: 500 })
  }
}
