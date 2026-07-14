import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')
    const auditType = searchParams.get('auditType')

    const where: any = {}
    if (sStep !== null) where.sStep = parseInt(sStep)
    if (projectId) where.projectId = projectId
    if (auditType) where.auditType = auditType

    const audits = await db.auditResult.findMany({
      where,
      orderBy: { auditDate: 'desc' },
    })

    return NextResponse.json({ success: true, audits, data: audits })
  } catch (error) {
    console.error('Error fetching audits:', error)
    return NextResponse.json({ success: false, error: 'Error fetching audits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sStep,
      auditorName,
      result,
      score,
      observations,
      auditType,
      checklistData,
      mejorasData,
      projectId,
    } = body

    // Server-side permission check: verify user has audit permission
    const sessionUser = await getAuthUser(request)
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    // Permission-driven: check if user's role has s{X}_step5_a1 permission (NO admin bypass)
    const sStepValue = sStep !== undefined ? sStep : 0
    const permConfig = await db.rolePermissionConfig.findUnique({
      where: { role_permission: { role: sessionUser.role, permission: `s${sStepValue}_step5_a1` } }
    })
    if (!permConfig?.allowed) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para realizar auditorías en este paso' }, { status: 403 })
    }

    if (auditorName === undefined || !result) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lookupProjectId = projectId
    if (!lookupProjectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }
    // Verify project exists
    const projectExists = await db.project.findUnique({ where: { id: lookupProjectId } })
    if (!projectExists) {
      return NextResponse.json({ success: false, error: `Project with id '${lookupProjectId}' not found` }, { status: 400 })
    }
    const auditTypeValue = auditType || 'quarterly'

    // Cap score at 100%
    const cappedScore = score ? Math.min(score, 100) : null;

    const audit = await db.auditResult.create({
      data: {
        sStep: sStepValue,
        auditorName,
        result,
        score: cappedScore,
        observations: observations || null,
        auditType: auditTypeValue,
        checklistData: checklistData || null,
        mejorasData: mejorasData || null,
        projectId: lookupProjectId,
      },
    })

    // If audit passed (apto) and sStep is 1-5, update progress for mini-step 5
    // For sStep=0 (quarterly combined audit), no progress update needed
    if (result === 'apto' && sStepValue >= 1 && sStepValue <= 5) {
      const zoneId = body.zoneId || null
      const existing = await db.progress.findFirst({
        where: { sStep: sStepValue, miniStep: 5, projectId: lookupProjectId, zoneId },
      })
      if (existing) {
        await db.progress.update({
          where: { id: existing.id },
          data: { completed: true, score: cappedScore || 100, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep: sStepValue, miniStep: 5, completed: true, score: cappedScore || 100, passedAt: new Date(), projectId: lookupProjectId, zoneId },
        })
      }
    }

    // For NOK items, create action items automatically
    if (checklistData) {
      try {
        const parsed = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData
        // checklistData can be an array of AuditItemResult or an object with keys
        const items = Array.isArray(parsed) ? parsed : Object.values(parsed)
        const nokItems = items.filter((val: any) => val.status === 'nok')

        for (const itemResult of nokItems) {
          await db.actionItem.create({
            data: {
              sStep: sStepValue,
              miniStep: auditTypeValue === 'weekly' ? -1 : auditTypeValue === 'monthly' ? -2 : 5,
              itemId: itemResult.itemId || 'unknown',
              itemDescription: itemResult.description || itemResult.itemId || 'Disfunción detectada en auditoría',
              hallazgo: itemResult.hallazgo || `Anomalía detectada en auditoría ${auditTypeValue}: ${itemResult.itemId || ''}`,
              mejora: itemResult.mejora || null,
              responsable: null,
              prioridad: 'media',
              estado: 'abierta',
              source: `auditoria_${auditTypeValue}`,
              projectId: lookupProjectId,
            },
          })
        }
      } catch (parseError) {
        console.error('Error parsing checklist data for action items:', parseError)
      }
    }

    return NextResponse.json({ success: true, data: audit })
  } catch (error) {
    console.error('Error creating audit:', error)
    return NextResponse.json({ success: false, error: 'Error creating audit' }, { status: 500 })
  }
}
