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

    // Get progress items
    const progressItems = await db.progress.findMany({
      where: projectId ? { projectId } : {},
      select: { sStep: true, miniStep: true, completed: true, score: true, photoUrls: true },
    })

    const completedSteps = progressItems.filter(p => p.completed)
    const totalMiniSteps = progressItems.length
    const completedMiniSteps = completedSteps.length
    const progressPercent = totalMiniSteps > 0 ? Math.round((completedMiniSteps / totalMiniSteps) * 100) : 0

    // Per-S progress
    const perSProgress: Record<number, { completed: number; total: number; percent: number; avgScore: number | null }> = {}
    for (let s = 1; s <= 5; s++) {
      const sItems = progressItems.filter(p => p.sStep === s)
      const sCompleted = sItems.filter(p => p.completed)
      const sWithScore = sCompleted.filter(p => p.score !== null)
      perSProgress[s] = {
        completed: sCompleted.length,
        total: sItems.length,
        percent: sItems.length > 0 ? Math.round((sCompleted.length / sItems.length) * 100) : 0,
        avgScore: sWithScore.length > 0
          ? Math.round(sWithScore.reduce((sum, p) => sum + (p.score ?? 0), 0) / sWithScore.length)
          : null,
      }
    }

    // Count quesitos earned (all 5 mini-steps completed for an S)
    let quesitosEarned = 0
    for (let s = 1; s <= 5; s++) {
      const sItems = progressItems.filter(p => p.sStep === s)
      if (sItems.length > 0 && sItems.every(p => p.completed)) quesitosEarned++
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
