import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper: check if user has a specific permission via rolePermissionConfig
async function hasPermission(role: string, permission: string): Promise<boolean> {
  const config = await db.rolePermissionConfig.findUnique({
    where: { role_permission: { role, permission } }
  })
  return config?.allowed === true
}

// Helper: check if a step is completed at zone/project level
async function isStepCompleted(sStep: number, miniStep: number, projectId: string, zoneId: string | null): Promise<boolean> {
  const where: any = { sStep, miniStep, projectId, completed: true }
  if (zoneId) where.zoneId = zoneId
  else where.zoneId = null

  const progress = await db.progress.findFirst({ where })
  if (progress) return true

  // Also check employeeProgress for individual steps (1, 4)
  if (miniStep === 1 || miniStep === 4) {
    const empWhere: any = { sStep, miniStep, projectId, completed: true }
    if (zoneId) empWhere.zoneId = zoneId
    const empProgress = await db.employeeProgress.findFirst({ where: empWhere })
    if (empProgress) return true
  }

  return false
}

// Helper: validate step prerequisites before marking as completed
async function validateStepPrerequisites(
  sStep: number, miniStep: number, projectId: string, zoneId: string | null, userRole: string
): Promise<{ valid: boolean; error?: string }> {
  const canSkip = await hasPermission(userRole, 'skip_steps')
  if (canSkip) return { valid: true } // Admin/skip users can bypass prerequisites

  // INTER-S validation: previous S must be completed (all 5 mini-steps)
  if (sStep > 1) {
    for (let ms = 1; ms <= 5; ms++) {
      const prevSCompleted = await isStepCompleted(sStep - 1, ms, projectId, zoneId)
      if (!prevSCompleted) {
        // Also check employeeProgress for any employee
        const empWhere: any = { sStep: sStep - 1, miniStep: ms, projectId, completed: true }
        if (zoneId) empWhere.zoneId = zoneId
        const empDone = await db.employeeProgress.findFirst({ where: empWhere })
        if (!empDone) {
          return { valid: false, error: `Debes completar la ${sStep - 1}ª S antes de continuar` }
        }
      }
    }
  }

  // INTRA-S validation: previous mini-step must be completed
  if (miniStep > 1 && miniStep <= 4) {
    const prevCompleted = await isStepCompleted(sStep, miniStep - 1, projectId, zoneId)
    if (!prevCompleted) {
      // Also check any employee progress
      const empWhere: any = { sStep, miniStep: miniStep - 1, projectId, completed: true }
      if (zoneId) empWhere.zoneId = zoneId
      const empDone = await db.employeeProgress.findFirst({ where: empWhere })
      if (!empDone) {
        return { valid: false, error: `Debes completar el paso ${miniStep - 1} antes de continuar` }
      }
    }
  }

  // Step 5 (audit): requires steps 1-4 ALL completed
  if (miniStep === 5) {
    for (let ms = 1; ms <= 4; ms++) {
      const stepCompleted = await isStepCompleted(sStep, ms, projectId, zoneId)
      if (!stepCompleted) {
        const empWhere: any = { sStep, miniStep: ms, projectId, completed: true }
        if (zoneId) empWhere.zoneId = zoneId
        const empDone = await db.employeeProgress.findFirst({ where: empWhere })
        if (!empDone) {
          return { valid: false, error: `Debes completar los pasos 1-4 antes de la auditoría` }
        }
      }
    }
  }

  // Step 3 of S2/S3/S4: requires at least one layout standard uploaded
  if (miniStep === 3 && (sStep === 2 || sStep === 3 || sStep === 4)) {
    const layoutWhere: any = { projectId, category: 'layout', sStep }
    if (zoneId) layoutWhere.zoneId = zoneId
    const layoutCount = await db.standard.count({ where: layoutWhere })
    if (layoutCount === 0) {
      return { valid: false, error: `Debes dibujar o subir un layout antes de completar este paso` }
    }
  }

  return { valid: true }
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
    const { completed, score, notes, photoUrls, projectId, zoneId, skipMissingTemplate } = body

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

    // Validate step prerequisites when marking as completed
    // Allow skipping prerequisites when no template is configured (skipMissingTemplate)
    if (completed && projectId && !skipMissingTemplate) {
      const validation = await validateStepPrerequisites(sStepNum, miniStepNum, projectId, zoneId || null, user.role)
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
      }
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
