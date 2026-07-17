import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const companyScope = searchParams.get('companyScope') // "empresa" = all projects in user's company

    // Get the authenticated user to scope data by company
    const user = await getAuthUser(request)
    const userRole = user?.role || 'empleado'
    const userId: string | null = user?.id || null
    const isGestor = userRole === 'gestor'

    // Determine which project IDs the user can see
    let allowedProjectIds: string[] | null = null // null = all (gestor)
    if (!isGestor && userId) {
      // Get project IDs from user's companies + direct memberships
      const companyMemberships = await db.companyMember.findMany({
        where: { userId },
        select: { companyId: true },
      })
      const companyIds = companyMemberships.map(cm => cm.companyId)

      const projects = await db.project.findMany({
        where: {
          active: true,
          OR: [
            { members: { some: { userId } } },
            { companyId: { in: companyIds.length > 0 ? companyIds : ['__none__'] } },
          ],
        },
        select: { id: true },
      })
      allowedProjectIds = projects.map(p => p.id)
    }

    // Build where clause scoping to allowed projects
    let baseWhere: any = {}
    if (projectId) {
      // Specific project requested — verify access
      if (allowedProjectIds && !allowedProjectIds.includes(projectId)) {
        return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
      }
      baseWhere = { projectId }
    } else if (allowedProjectIds) {
      baseWhere = { projectId: { in: allowedProjectIds } }
    }

    const where = baseWhere

    // Get audit results with scores
    const auditResults = await db.auditResult.findMany({
      where: baseWhere,
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
      where: baseWhere,
      select: { sStep: true, miniStep: true, completed: true, score: true, photoUrls: true },
    })

    // Also get employee-level progress (for individual steps like Formación/step 1)
    const employeeProgressItems = await db.employeeProgress.findMany({
      where: baseWhere,
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

    // Additional counts for MaintenanceView counters
    const [
      checklistResponses,
      auditResultsCount,
      inventoryCount,
    ] = await Promise.all([
      db.checklistResponse.count({ where: baseWhere }),
      db.auditResult.count({ where: baseWhere }),
      db.inventoryItem.count({ where: baseWhere }),
    ])
    // Count photos from progress items (non-null photoUrls)
    const photosCount = progressItems.filter(p => p.photoUrls && p.photoUrls.length > 2).length

    // Per-S details (photos, actions, completed steps) for MaintenanceView
    const perSDetails: Record<number, { photos: number; actions: number; completed: number }> = {}
    for (let s = 1; s <= 5; s++) {
      const sPhotos = progressItems.filter(p => p.sStep === s && p.photoUrls && p.photoUrls.length > 2).length
      const sActions = await db.actionItem.count({ where: { ...where, sStep: s } })
      perSDetails[s] = {
        photos: sPhotos,
        actions: sActions,
        completed: perSProgress[s]?.completed || 0,
      }
    }

    // For company scope: get per-project breakdown (scoped to user's companies)
    let perProjectBreakdown = null
    if (companyScope === 'empresa') {
      const projects = await db.project.findMany({
        where: allowedProjectIds
          ? { active: true, id: { in: allowedProjectIds } }
          : { active: true },
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
        perS: perSDetails,
        total: {
          checklistResponses: checklistResponses,
          auditResults: auditResultsCount,
          actionItems: totalActions,
          inventory: inventoryCount,
          completedSteps: completedMiniSteps,
        },
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
