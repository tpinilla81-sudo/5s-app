import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const where = projectId ? { projectId } : {}

    // Get counts from all data tables
    const [
      inventoryCount,
      checklistCount,
      actionItemCount,
      auditResultCount,
      examAnswerCount,
      progressItems,
    ] = await Promise.all([
      db.inventoryItem.count({ where: projectId ? { projectId } : {} }),
      db.checklistResponse.count({ where: projectId ? { projectId } : {} }),
      db.actionItem.count({ where: projectId ? { projectId } : {} }),
      db.auditResult.count({ where: projectId ? { projectId } : {} }),
      db.examAnswer.count({ where: projectId ? { projectId } : {} }),
      db.progress.findMany({
        where: { ...where, completed: true },
        select: { sStep: true, miniStep: true, photoUrls: true, score: true },
      }),
    ])

    // Count photos from progress records
    let photoCount = 0
    for (const p of progressItems) {
      if (p.photoUrls) {
        try {
          const urls = JSON.parse(p.photoUrls)
          if (Array.isArray(urls)) photoCount += urls.length
          else photoCount++
        } catch {
          photoCount += p.photoUrls.split(',').filter(Boolean).length
        }
      }
    }

    // Count per-S-step data
    const perS: Record<number, {
      inventory: number
      checklist: number
      actions: number
      completed: number
      photos: number
    }> = {}

    for (let s = 1; s <= 5; s++) {
      const sWhere = projectId ? { projectId, sStep: s } : { sStep: s }
      const sProgressWhere = projectId ? { projectId, sStep: s, completed: true } : { sStep: s, completed: true }

      const [sInv, sCheck, sActions, sCompleted] = await Promise.all([
        db.inventoryItem.count({ where: sWhere }),
        db.checklistResponse.count({ where: sWhere }),
        db.actionItem.count({ where: sWhere }),
        db.progress.count({ where: sProgressWhere }),
      ])

      // Count photos for this S step
      let sPhotos = 0
      const sProgressWithPhotos = progressItems.filter(p => p.sStep === s && p.photoUrls)
      for (const p of sProgressWithPhotos) {
        if (p.photoUrls) {
          try {
            const urls = JSON.parse(p.photoUrls)
            if (Array.isArray(urls)) sPhotos += urls.length
            else sPhotos++
          } catch {
            sPhotos += p.photoUrls.split(',').filter(Boolean).length
          }
        }
      }

      perS[s] = {
        inventory: sInv,
        checklist: sCheck,
        actions: sActions,
        completed: sCompleted,
        photos: sPhotos,
      }
    }

    // Actions by status
    const actionsByStatus = {
      abierta: await db.actionItem.count({ where: { ...where, estado: 'abierta' } }),
      en_proceso: await db.actionItem.count({ where: { ...where, estado: 'en_proceso' } }),
      resuelta: await db.actionItem.count({ where: { ...where, estado: 'resuelta' } }),
      cerrada: await db.actionItem.count({ where: { ...where, estado: 'cerrada' } }),
    }

    // Checklist responses by type
    const autoevalCount = await db.checklistResponse.count({
      where: { ...where, miniStep: 4 }
    })
    const auditCount = await db.checklistResponse.count({
      where: { ...where, miniStep: 5 }
    })

    // Inventory by S
    const inventoryByS: Record<number, number> = {}
    for (let s = 1; s <= 5; s++) {
      inventoryByS[s] = await db.inventoryItem.count({
        where: projectId ? { projectId, sStep: s } : { sStep: s }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        total: {
          inventory: inventoryCount,
          checklistResponses: checklistCount,
          actionItems: actionItemCount,
          auditResults: auditResultCount,
          examAnswers: examAnswerCount,
          photos: photoCount,
          completedSteps: progressItems.length,
          autoevaluaciones: autoevalCount,
          auditorias: auditCount,
        },
        perS,
        actionsByStatus,
        inventoryByS,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ success: false, error: 'Error fetching stats' }, { status: 500 })
  }
}
