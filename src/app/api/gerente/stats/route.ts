import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGerenteUser } from '@/lib/auth-helpers'

/**
 * GET /api/gerente/stats?company=Empresa+Demo
 *
 * Returns global KPIs for all projects of a given company:
 * - Total projects and zones (with responsible person per zone)
 * - Global progress (completed mini-steps / 25 per project)
 * - Actions by status across all projects
 * - Inventory summary (total, unnecessary, parked money)
 * - Photos, autoevaluations, audits counts
 * - Per-project breakdown with zones and their responsables
 * - Per-S progress across the company
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check - only gerente or admin can access
    const user = await getGerenteUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')

    if (!company) {
      return NextResponse.json({ success: false, error: 'company parameter is required' }, { status: 400 })
    }

    // Get all projects for this company, with zones and their members (responsables)
    const projects = await db.project.findMany({
      where: { company },
      include: {
        zones: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
        },
        progress: true,
        inventoryItems: true,
        actionItems: true,
        checklistResponses: true,
        auditResults: true,
      },
    })

    if (projects.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalProjects: 0,
          totalZones: 0,
          globalProgress: { completed: 0, total: 0, percent: 0 },
          actionsByStatus: { abierta: 0, en_proceso: 0, resuelta: 0, cerrada: 0 },
          inventory: { total: 0, innecesario: 0, dudoso: 0, util: 0, dineroParado: 0 },
          photos: 0,
          autoevaluaciones: 0,
          auditorias: 0,
          perProject: [],
          perS: {},
          overdueActions: 0,
        },
      })
    }

    // Global counters
    let totalCompletedSteps = 0
    let totalMiniSteps = 0
    let totalPhotos = 0
    let totalInventory = 0
    let totalInnecesario = 0
    let totalDudoso = 0
    let totalUtil = 0
    let dineroParado = 0
    const actionsByStatus = { abierta: 0, en_proceso: 0, resuelta: 0, cerrada: 0 }
    const perS: Record<number, { completed: number; total: number; actions: number; inventory: number; photos: number; scoreSum: number; scoreCount: number }> = {}
    for (let s = 1; s <= 5; s++) {
      perS[s] = { completed: 0, total: 0, actions: 0, inventory: 0, photos: 0, scoreSum: 0, scoreCount: 0 }
    }

    // Per-project breakdown
    const perProject = []

    for (const project of projects) {
      const projectCompleted = project.progress.filter(p => p.completed).length
      totalCompletedSteps += projectCompleted
      totalMiniSteps += 25

      // Photos
      for (const p of project.progress) {
        if (p.photoUrls) {
          try {
            const urls = JSON.parse(p.photoUrls)
            if (Array.isArray(urls)) totalPhotos += urls.length
            else totalPhotos++
          } catch {
            totalPhotos += p.photoUrls.split(',').filter(Boolean).length
          }
        }
      }

      // Inventory
      totalInventory += project.inventoryItems.length
      for (const item of project.inventoryItems) {
        if (item.category === 'innecesario') {
          totalInnecesario++
          dineroParado += (item.estimatedValue || 0) * item.quantity
        } else if (item.category === 'dudoso') {
          totalDudoso++
          dineroParado += (item.estimatedValue || 0) * item.quantity
        } else {
          totalUtil++
        }
      }

      // Actions
      for (const action of project.actionItems) {
        if (action.estado in actionsByStatus) {
          actionsByStatus[action.estado as keyof typeof actionsByStatus]++
        }
      }

      // Per-S data
      for (let s = 1; s <= 5; s++) {
        const sProgress = project.progress.filter(p => p.sStep === s)
        perS[s].completed += sProgress.filter(p => p.completed).length
        perS[s].total += 5
        perS[s].actions += project.actionItems.filter(a => a.sStep === s).length
        perS[s].inventory += project.inventoryItems.filter(i => i.sStep === s).length

        for (const p of sProgress) {
          if (p.photoUrls) {
            try {
              const urls = JSON.parse(p.photoUrls)
              if (Array.isArray(urls)) perS[s].photos += urls.length
              else perS[s].photos++
            } catch {
              perS[s].photos += p.photoUrls.split(',').filter(Boolean).length
            }
          }
        }

        const completedWithScore = sProgress.filter(p => p.completed && p.score !== null)
        if (completedWithScore.length > 0) {
          perS[s].scoreSum += completedWithScore.reduce((sum, p) => sum + (p.score ?? 0), 0) / completedWithScore.length
          perS[s].scoreCount++
        }
      }

      const autoevalCount = project.checklistResponses.filter(c => c.miniStep === 4).length
      const auditCount = project.checklistResponses.filter(c => c.miniStep === 5).length

      // Build zones with their responsable info
      const zonesWithResponsable = project.zones.map(z => {
        const responsable = z.members.find(m => m.role === 'responsable')
        return {
          id: z.id,
          name: z.name,
          color: z.color,
          responsable: responsable ? {
            id: responsable.user.id,
            name: responsable.user.name,
            email: responsable.user.email,
          } : null,
          memberCount: z.members.length,
        }
      })

      perProject.push({
        id: project.id,
        name: project.name,
        company: project.company,
        completedSteps: projectCompleted,
        totalSteps: 25,
        percent: Math.round((projectCompleted / 25) * 100),
        zones: zonesWithResponsable,
        inventory: project.inventoryItems.length,
        actions: project.actionItems.length,
        autoevaluaciones: autoevalCount,
        auditorias: auditCount,
        innecesarios: project.inventoryItems.filter(i => i.category === 'innecesario').length,
        dineroParado: project.inventoryItems
          .filter(i => i.category === 'innecesario' || i.category === 'dudoso')
          .reduce((sum, i) => sum + (i.estimatedValue || 0) * i.quantity, 0),
      })
    }

    // Average per-S scores
    const perSResult: Record<number, { completed: number; total: number; percent: number; actions: number; inventory: number; photos: number; avgScore: number }> = {}
    for (let s = 1; s <= 5; s++) {
      perSResult[s] = {
        completed: perS[s].completed,
        total: perS[s].total,
        percent: perS[s].total > 0 ? Math.round((perS[s].completed / perS[s].total) * 100) : 0,
        actions: perS[s].actions,
        inventory: perS[s].inventory,
        photos: perS[s].photos,
        avgScore: perS[s].scoreCount > 0 ? Math.round(perS[s].scoreSum / perS[s].scoreCount) : 0,
      }
    }

    // Overdue actions
    const now = new Date()
    const overdueActions = await db.actionItem.count({
      where: {
        projectId: { in: projects.map(p => p.id) },
        estado: { in: ['abierta', 'en_proceso'] },
        fechaLimite: { lt: now },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalZones: projects.reduce((sum, p) => sum + p.zones.length, 0),
        globalProgress: {
          completed: totalCompletedSteps,
          total: totalMiniSteps,
          percent: totalMiniSteps > 0 ? Math.round((totalCompletedSteps / totalMiniSteps) * 100) : 0,
        },
        actionsByStatus,
        overdueActions,
        inventory: {
          total: totalInventory,
          innecesario: totalInnecesario,
          dudoso: totalDudoso,
          util: totalUtil,
          dineroParado: Math.round(dineroParado * 100) / 100,
        },
        photos: totalPhotos,
        autoevaluaciones: projects.reduce((sum, p) => sum + p.checklistResponses.filter(c => c.miniStep === 4).length, 0),
        auditorias: projects.reduce((sum, p) => sum + p.checklistResponses.filter(c => c.miniStep === 5).length, 0),
        perProject,
        perS: perSResult,
      },
    })
  } catch (error) {
    console.error('Error fetching gerente stats:', error)
    return NextResponse.json({ success: false, error: 'Error fetching gerente stats' }, { status: 500 })
  }
}
