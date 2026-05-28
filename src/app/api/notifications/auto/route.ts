import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/notifications/auto — Auto-generate audit_ready notifications
// Checks all zones for S-steps where steps 1-4 are completed but step 5 isn't,
// and creates notifications for auditors/responsables if not already notified recently
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

    let notificationsCreated = 0

    for (const zone of zones) {
      // Check each S-step (1-5)
      for (let s = 1; s <= 5; s++) {
        // Check if steps 1-4 are completed (zone-level OR employee-level)
        let steps1to4Done = true
        for (let ms = 1; ms <= 4; ms++) {
          const zoneCompleted = await db.progress.findFirst({
            where: {
              sStep: s, miniStep: ms,
              zoneId: zone.id, completed: true
            }
          })
          if (zoneCompleted) continue

          const empCompleted = await db.employeeProgress.findFirst({
            where: {
              sStep: s, miniStep: ms,
              zoneId: zone.id, completed: true
            }
          })
          if (empCompleted) continue

          steps1to4Done = false
          break
        }

        if (!steps1to4Done) continue

        // Check step 5 is NOT completed
        const step5Done = await db.progress.findFirst({
          where: {
            sStep: s, miniStep: 5,
            zoneId: zone.id, completed: true
          }
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
        const S_NAMES: Record<number, string> = { 1: 'Seiri', 2: 'Seiton', 3: 'Seiso', 4: 'Seiketsu', 5: 'Shitsuke' }
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

        // Create notifications for all responsables
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
