import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: check if user has a specific permission via rolePermissionConfig
async function hasPermission(role: string, permission: string): Promise<boolean> {
  const config = await db.rolePermissionConfig.findUnique({
    where: { role_permission: { role, permission } }
  })
  return config?.allowed === true
}

// Helper: perform the actual progress upsert
async function handleProgressUpdate(
  sStep: number,
  miniStep: number,
  data: { completed?: boolean; score?: number | null; notes?: string | null; photoUrls?: string | null; projectId?: string; zoneId?: string }
) {
  const lookupProjectId = data.projectId
  if (!lookupProjectId) {
    return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
  }

  // Build the where clause for finding existing record
  const findWhere: any = {
    sStep,
    miniStep,
    projectId: lookupProjectId,
  }
  if (data.zoneId) {
    findWhere.zoneId = data.zoneId
  } else {
    findWhere.zoneId = null
  }

  const existing = await db.progress.findFirst({
    where: findWhere,
  })

  let result
  if (existing) {
    result = await db.progress.update({
      where: { id: existing.id },
      data: {
        completed: data.completed ?? existing.completed,
        score: data.score ?? existing.score,
        notes: data.notes ?? existing.notes,
        photoUrls: data.photoUrls ?? existing.photoUrls,
        passedAt: data.completed && !existing.completed ? new Date() : existing.passedAt,
      },
    })
  } else {
    result = await db.progress.create({
      data: {
        sStep,
        miniStep,
        completed: data.completed ?? false,
        score: data.score ?? null,
        notes: data.notes ?? null,
        photoUrls: data.photoUrls ?? null,
        projectId: lookupProjectId,
        zoneId: data.zoneId || null,
        passedAt: data.completed ? new Date() : null,
      },
    })
  }

  return NextResponse.json({ success: true, data: result })
}

// GET /api/progress/step?sStep=1&miniStep=2&projectId=xxx&zoneId=yyy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    if (!sStep || !miniStep) {
      return NextResponse.json({ success: false, error: 'sStep and miniStep are required' }, { status: 400 })
    }

    const where: any = { sStep: parseInt(sStep), miniStep: parseInt(miniStep) }
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId

    const progress = await db.progress.findFirst({
      where,
    })
    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json({ success: false, error: 'Error fetching progress' }, { status: 500 })
  }
}

// PUT /api/progress/step?sStep=1&miniStep=2
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')

    if (!sStep || !miniStep) {
      return NextResponse.json({ success: false, error: 'sStep and miniStep are required' }, { status: 400 })
    }

    const miniStepNum = parseInt(miniStep)
    const sStepNum = parseInt(sStep)

    // Parse body once
    const body = await request.json()
    const { completed, score, notes, photoUrls, projectId, zoneId } = body

    // Permission-based access control — check via rolePermissionConfig
    const sessionRes = await fetch(new URL('/api/auth', request.url).toString(), {
      headers: { cookie: request.headers.get('cookie') || '' },
    })
    const sessionData = await sessionRes.json()
    const user = sessionData.user

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    // Check s{X}_step{Y}_a1 permission for this specific step
    const permId = `s${sStepNum}_step${miniStepNum}_a1`
    const canPerform = await hasPermission(user.role, permId)
    if (!canPerform) {
      return NextResponse.json({ success: false, error: `No tienes permiso para realizar el paso ${miniStepNum} de S${sStepNum}` }, { status: 403 })
    }

    return await handleProgressUpdate(sStepNum, miniStepNum, { completed, score, notes, photoUrls, projectId, zoneId })
  } catch (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json({ success: false, error: 'Error updating progress' }, { status: 500 })
  }
}

// DELETE /api/progress/step?sStep=1&miniStep=2&projectId=xxx&zoneId=yyy
// Admin-only: Reset a step's progress (undo admin test actions)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    if (!sStep || !miniStep || !projectId) {
      return NextResponse.json({ success: false, error: 'sStep, miniStep, and projectId are required' }, { status: 400 })
    }

    // Verify admin role
    const sessionRes = await fetch(new URL('/api/auth', request.url).toString(), {
      headers: { cookie: request.headers.get('cookie') || '' },
    })
    const sessionData = await sessionRes.json()
    const user = sessionData.user

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    // Permission-driven: check reset_data or skip_steps permission (NO role bypass)
    const canReset = await hasPermission(user.role, 'reset_data') || await hasPermission(user.role, 'skip_steps')
    if (!canReset) {
      return NextResponse.json({ success: false, error: 'No tienes permiso para restablecer pasos' }, { status: 403 })
    }

    const sStepNum = parseInt(sStep)
    const miniStepNum = parseInt(miniStep)

    // Find and delete the progress record
    const findWhere: any = {
      sStep: sStepNum,
      miniStep: miniStepNum,
      projectId,
    }
    if (zoneId) {
      findWhere.zoneId = zoneId
    } else {
      findWhere.zoneId = null
    }

    const existing = await db.progress.findFirst({
      where: findWhere,
    })

    if (existing) {
      await db.progress.delete({
        where: { id: existing.id },
      })
    }

    // Also delete related EmployeeProgress records for step 1 (individual step)
    if (miniStepNum === 1 && zoneId) {
      await db.employeeProgress.deleteMany({
        where: {
          sStep: sStepNum,
          miniStep: 1,
          projectId,
          zoneId,
        },
      })
    }

    // Also delete related audit results for step 5
    if (miniStepNum === 5) {
      await db.auditResult.deleteMany({
        where: {
          sStep: sStepNum,
          projectId,
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Paso restablecido correctamente' })
  } catch (error) {
    console.error('Error resetting progress:', error)
    return NextResponse.json({ success: false, error: 'Error resetting progress' }, { status: 500 })
  }
}
