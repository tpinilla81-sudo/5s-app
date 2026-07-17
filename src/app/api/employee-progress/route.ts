import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId
    if (sStep) where.sStep = parseInt(sStep)
    if (miniStep) where.miniStep = parseInt(miniStep)
    if (userId) where.userId = userId

    const employeeProgress = await db.employeeProgress.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
    })
    return NextResponse.json({ success: true, data: employeeProgress })
  } catch (error) {
    console.error('Error fetching employee progress:', error)
    return NextResponse.json({ success: false, error: 'Error fetching employee progress' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, completed, score, notes, projectId, zoneId, userId } = body

    if (!sStep || !miniStep || !projectId || !zoneId || !userId) {
      return NextResponse.json({ success: false, error: 'sStep, miniStep, projectId, zoneId, and userId are required' }, { status: 400 })
    }

    // Individual steps: 1 (formación+examen) and 4 (autoevaluación for S1/S2/S3/S5)
    // Step 4 is individual because each employee/responsable does their own self-assessment
    const INDIVIDUAL_MINI_STEPS = [1, 4]
    if (!INDIVIDUAL_MINI_STEPS.includes(miniStep)) {
      return NextResponse.json({ success: false, error: 'EmployeeProgress is only for individual steps (miniStep 1 or 4)' }, { status: 400 })
    }

    const existing = await db.employeeProgress.findUnique({
      where: { sStep_miniStep_projectId_zoneId_userId: { sStep, miniStep, projectId, zoneId, userId } },
    })

    let result
    if (existing) {
      result = await db.employeeProgress.update({
        where: { id: existing.id },
        data: {
          completed: completed ?? existing.completed,
          score: score ?? existing.score,
          notes: notes ?? existing.notes,
          passedAt: completed && !existing.completed ? new Date() : existing.passedAt,
        },
      })
    } else {
      result = await db.employeeProgress.create({
        data: {
          sStep,
          miniStep,
          completed: completed ?? false,
          score,
          notes,
          projectId,
          zoneId,
          userId,
          passedAt: completed ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating/updating employee progress:', error)
    return NextResponse.json({ success: false, error: 'Error creating/updating employee progress' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, completed, score, notes, projectId, zoneId, userId } = body

    if (!id) {
      // If no id, try to find by composite key
      const { sStep, miniStep } = body
      if (!sStep || !miniStep || !projectId || !zoneId || !userId) {
        return NextResponse.json({ success: false, error: 'Either id or (sStep, miniStep, projectId, zoneId, userId) are required' }, { status: 400 })
      }

      const existing = await db.employeeProgress.findUnique({
        where: { sStep_miniStep_projectId_zoneId_userId: { sStep, miniStep, projectId, zoneId, userId } },
      })

      if (!existing) {
        return NextResponse.json({ success: false, error: 'EmployeeProgress record not found' }, { status: 404 })
      }

      const result = await db.employeeProgress.update({
        where: { id: existing.id },
        data: {
          completed: completed ?? existing.completed,
          score: score ?? existing.score,
          notes: notes ?? existing.notes,
          passedAt: completed && !existing.completed ? new Date() : existing.passedAt,
        },
      })

      return NextResponse.json({ success: true, data: result })
    }

    const existing = await db.employeeProgress.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'EmployeeProgress record not found' }, { status: 404 })
    }

    const result = await db.employeeProgress.update({
      where: { id },
      data: {
        completed: completed ?? existing.completed,
        score: score ?? existing.score,
        notes: notes ?? existing.notes,
        passedAt: completed && !existing.completed ? new Date() : existing.passedAt,
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating employee progress:', error)
    return NextResponse.json({ success: false, error: 'Error updating employee progress' }, { status: 500 })
  }
}
