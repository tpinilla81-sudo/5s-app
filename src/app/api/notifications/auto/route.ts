import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/notifications/auto — Auto-generate notifications
// 1. When steps 1-3 are done → notify responsable that step 4 (autoevaluación) is ready
// 2. When steps 1-4 are done → notify auditor and responsable that step 5 (auditoría) is ready
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 })
    }

    // Get all zones for this project
    const zones = await db.zone.findMany({ where: { projectId } })
    // Get all project members
    const members = await db.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, role: true } } }
    })

    const auditors = members.filter(m => m.role === 'auditor')
    const responsables = members.filter(m => m.role === 'responsable')

    const S_NAMES: Record<number, string> = { 1: 'Seiri', 2: 'Seiton', 3: 'Seiso', 4: 'Seiketsu', 5: 'Shitsuke' }
    let notificationsCreated = 0

    for (const zone of zones) {
      // Check each S-step (1-5)
      for (let s = 1; s <= 5; s++) {

        // ── Check if steps 1-3 are completed (step 4 / autoevaluación ready) ──
        let steps1to3Done = true
        for (let ms = 1; ms <= 3; ms++) {
          const zoneCompleted = await db.progress.findFirst({
            where: { sStep: s, miniStep: ms, zoneId: zone.id, completed: true }
          })
          if (zoneCompleted) continue
          const empCompleted = await db.employeeProgress.findFirst({
            where: { sStep: s, miniStep: ms, zoneId: zone.id, completed: true }
          })
          if (empCompleted) continue
          steps1to3Done = false
          break
        }

        if (steps1to3Done) {
          // Check step 4 is NOT completed yet
          const step4Done_zone = await db.progress.findFirst({
            where: { sStep: s, miniStep: 4, zoneId: zone.id, completed: true }
          })
          const step4Done_emp = await db.employeeProgress.findFirst({
            where: { sStep: s, miniStep: 4, zoneId: zone.id, completed: true }
          })

          if (!step4Done_zone && !step4Done_emp) {
            // Check if we already sent a autoeval_ready notification recently
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const existingNotif = await db.notification.findFirst({
              where: {
                type: 'autoeval_ready',
                sStep: s,
                zoneId: zone.id,
                projectId,
                createdAt: { gte: oneDayAgo }
              }
            })
            if (!existingNotif) {
              // Notify responsables that step 4 (autoevaluación) is ready
              const title = `Autoevaluación lista: S${s} — ${S_NAMES[s] || ''}`
              const message = `Los pasos 1-3 de S${s} (${S_NAMES[s] || ''}) en la zona "${zone.name}" han sido completados. La autoevaluación (Paso 4) está lista para que el responsable la realice.`

              for (const resp of responsables) {
                await db.notification.create({
                  data: {
                    userId: resp.userId,
                    type: 'autoeval_ready',
                    title,
                    message,
                    sStep: s,
                    zoneId: zone.id,
                    projectId,
                  }
                })
                notificationsCreated++
              }
            }
          }
        }

        // ── Check if steps 1-4 are completed (step 5 / auditoría ready) ──
        let steps1to4Done = true
        for (let ms = 1; ms <= 4; ms++) {
          const zoneCompleted = await db.progress.findFirst({
            where: { sStep: s, miniStep: ms, zoneId: zone.id, completed: true }
          })
          if (zoneCompleted) continue
          const empCompleted = await db.employeeProgress.findFirst({
            where: { sStep: s, miniStep: ms, zoneId: zone.id, completed: true }
          })
          if (empCompleted) continue
          steps1to4Done = false
          break
        }

        if (!steps1to4Done) continue

        // Check step 5 is NOT completed
        const step5Done = await db.progress.findFirst({
          where: { sStep: s, miniStep: 5, zoneId: zone.id, completed: true }
        })
        if (step5Done) continue

        // Check if we already sent a notification for this S-step + zone in the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const existingNotif = await db.notification.findFirst({
          where: {
            type: 'audit_ready',
            sStep: s,
            zoneId: zone.id,
            projectId,
            createdAt: { gte: oneDayAgo }
          }
        })
        if (existingNotif) continue // Already notified recently

        // Create notifications for all auditors
        const title = `Auditoría lista: S${s} — ${S_NAMES[s] || ''}`
        const message = `Los pasos 1-4 de S${s} (${S_NAMES[s] || ''}) en la zona "${zone.name}" han sido completados. La auditoría (Paso 5) está lista para realizarse.`

        for (const auditor of auditors) {
          await db.notification.create({
            data: {
              userId: auditor.userId,
              type: 'audit_ready',
              title,
              message,
              sStep: s,
              zoneId: zone.id,
              projectId,
            }
          })
          notificationsCreated++
        }

        // Also notify responsables that audit is ready
        for (const resp of responsables) {
          await db.notification.create({
            data: {
              userId: resp.userId,
              type: 'audit_ready',
              title,
              message,
              sStep: s,
              zoneId: zone.id,
              projectId,
            }
          })
          notificationsCreated++
        }
      }
    }

    return NextResponse.json({ success: true, notificationsCreated })
  } catch (error) {
    console.error('Error auto-generating notifications:', error)
    return NextResponse.json({ success: false, error: 'Error auto-generating notifications' }, { status: 500 })
  }
}
