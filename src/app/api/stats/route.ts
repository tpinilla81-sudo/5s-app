import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const companyScope = searchParams.get('companyScope') // "empresa" = all projects

    const where = projectId ? { projectId } : {}

    // Get audit results with scores
    const auditResults = await db.auditResult.findMany({
      where: projectId ? { projectId } : {},
      select: {
        score: true,
        result: true,
        auditType: true,
        sStep: true,
        projectId: true,
        auditDate: true,
      },
      orderBy: { auditDate: 'desc' },
    })

    // Calculate average audit score
    const auditsWithScore = auditResults.filter(a => a.score !== null)
    const avgAuditScore = auditsWithScore.length > 0
      ? Math.round(auditsWithScore.reduce((sum, a) => sum + (a.score ?? 0), 0) / auditsWithScore.length)
      : null

    // Latest audit score
    const latestAudit = auditsWithScore.length > 0 ? auditsWithScore[0] : null

    // Get progress items (zone-level)
    const progressItems = await db.progress.findMany({
      where: projectId ? { projectId } : {},
      select: { sStep: true, miniStep: true, completed: true, score: true, photoUrls: true },
    })

    // Also get employee-level progress (for individual steps like Formación/step 1)
    const employeeProgressItems = await db.employeeProgress.findMany({
      where: projectId ? { projectId } : {},
      select: { sStep: true, miniStep: true, completed: true, score: true },
    })

    // Helper: check if a mini-step is completed at EITHER zone-level OR by any employee
    const isStepCompleted = (s: number, ms: number): boolean => {
      // Check zone-level progress first
      const zoneStep = progressItems.find(p => p.sStep === s && p.miniStep === ms && p.completed)
      if (zoneStep) return true
      // Also check employee progress (for individual steps like formación/step 1)
      const empStep = employeeProgressItems.find(ep => ep.sStep === s && ep.miniStep === ms && ep.completed)
      if (empStep) return true
      return false
    }

    const totalMiniSteps = 25 // Always 5 S-steps × 5 mini-steps
    let completedMiniSteps = 0
    for (let s = 1; s <= 5; s++) {
      for (let ms = 1; ms <= 5; ms++) {
        if (isStepCompleted(s, ms)) completedMiniSteps++
      }
    }
    const progressPercent = Math.round((completedMiniSteps / totalMiniSteps) * 100)

    // Per-S progress — always 5 mini-steps per S
    const perSProgress: Record<number, { completed: number; total: number; percent: number; avgScore: number | null }> = {}
    for (let s = 1; s <= 5; s++) {
      let sCompletedCount = 0
      let sScoreSum = 0
      let sScoreCount = 0
      for (let ms = 1; ms <= 5; ms++) {
        if (isStepCompleted(s, ms)) {
          sCompletedCount++
          // Get score from either zone-level or employee progress
          const zoneStep = progressItems.find(p => p.sStep === s && p.miniStep === ms && p.completed)
          const empStep = employeeProgressItems.find(ep => ep.sStep === s && ep.miniStep === ms && ep.completed)
          const score = zoneStep?.score ?? empStep?.score ?? null
          if (score !== null) {
            sScoreSum += score
            sScoreCount++
          }
        }
      }
      perSProgress[s] = {
        completed: sCompletedCount,
        total: 5, // Always 5 mini-steps per S
        percent: Math.round((sCompletedCount / 5) * 100),
        avgScore: sScoreCount > 0 ? Math.round(sScoreSum / sScoreCount) : null,
      }
    }

    // Count quesitos earned (all 5 mini-steps completed for an S)
    let quesitosEarned = 0
    for (let s = 1; s <= 5; s++) {
      let allDone = true
      for (let ms = 1; ms <= 5; ms++) {
        if (!isStepCompleted(s, ms)) { allDone = false; break }
      }
      if (allDone) quesitosEarned++
    }

    // Actions by status
    const [
      abierta,
      en_proceso,
      resuelta,
      cerrada,
      totalActions,
    ] = await Promise.all([
      db.actionItem.count({ where: { ...where, estado: 'abierta' } }),
      db.actionItem.count({ where: { ...where, estado: 'en_proceso' } }),
      db.actionItem.count({ where: { ...where, estado: 'resuelta' } }),
      db.actionItem.count({ where: { ...where, estado: 'cerrada' } }),
      db.actionItem.count({ where }),
    ])

    // For company scope: get per-project breakdown
    let perProjectBreakdown = null
    if (companyScope === 'empresa') {
      const projects = await db.project.findMany({
        where: { active: true },
        select: { id: true, name: true, company: true },
      })

      perProjectBreakdown = []
      for (const proj of projects) {
        const [projProgress, projAudits, projActions] = await Promise.all([
          db.progress.findMany({
            where: { projectId: proj.id },
            select: { completed: true, score: true, sStep: true },
          }),
          db.auditResult.findMany({
            where: { projectId: proj.id, score: { not: null } },
            select: { score: true },
          }),
          db.actionItem.groupBy({
            by: ['estado'],
            where: { projectId: proj.id },
            _count: true,
          }),
        ])

        const projCompleted = projProgress.filter(p => p.completed).length
        const projTotal = projProgress.length
        const projAvgAudit = projAudits.length > 0
          ? Math.round(projAudits.reduce((sum, a) => sum + (a.score ?? 0), 0) / projAudits.length)
          : null

        const actionMap: Record<string, number> = {}
        for (const a of projActions) {
          actionMap[a.estado] = a._count
        }

        perProjectBreakdown.push({
          id: proj.id,
          name: proj.name,
          company: proj.company,
          progressPercent: projTotal > 0 ? Math.round((projCompleted / projTotal) * 100) : 0,
          avgAuditScore: projAvgAudit,
          actions: {
            abierta: actionMap['abierta'] || 0,
            en_proceso: actionMap['en_proceso'] || 0,
            resuelta: actionMap['resuelta'] || 0,
            cerrada: actionMap['cerrada'] || 0,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        // 3 main indicators
        auditScore: avgAuditScore,
        latestAuditScore: latestAudit?.score ?? null,
        latestAuditDate: latestAudit?.auditDate ?? null,
        progressPercent,
        completedMiniSteps,
        totalMiniSteps,
        quesitosEarned,
        perSProgress,
        actions: {
          abierta,
          en_proceso,
          resuelta,
          cerrada,
          total: totalActions,
        },
        perProjectBreakdown,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ success: false, error: 'Error fetching stats' }, { status: 500 })
  }
}
