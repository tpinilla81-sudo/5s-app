import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, answers, projectId, zoneId } = body

    if (!sStep || !answers) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lookupProjectId = projectId
    if (!lookupProjectId) {
      return NextResponse.json({ success: false, error: 'projectId is required. No project selected.' }, { status: 400 })
    }

    // Try to find the exam template: first from board config (if zone has one), then global
    let template = null

    // Check if the zone has a board configuration with exam templates
    if (zoneId) {
      const zone = await db.zone.findUnique({ where: { id: zoneId }, select: { boardConfigId: true } })
      if (zone?.boardConfigId) {
        const boardSlot = await db.boardSlot.findFirst({
          where: { boardConfigId: zone.boardConfigId, sStep, miniStep: 1 },
          include: {
            templates: {
              include: { template: true },
              where: { template: { type: 'examen', active: true } },
            },
          },
        })
        if (boardSlot && boardSlot.templates.length > 0) {
          template = boardSlot.templates[0].template
        }
      }
    }

    // Fallback to global template
    if (!template) {
      template = await db.template.findFirst({
        where: { type: 'examen', sStep, active: true },
      })
    }

    if (!template) {
      return NextResponse.json({ success: false, error: 'No exam template found for this S' }, { status: 404 })
    }

    const parsedContent = JSON.parse(template.content)
    const questions = (parsedContent.questions || parsedContent) as Array<{
      question: string
      options: string[]
      correctIndex: number
    }>

    let correct = 0
    const results = answers.map((a: { questionIdx: number; answerIdx: number }) => {
      const isCorrect = questions[a.questionIdx]?.correctIndex === a.answerIdx
      if (isCorrect) correct++
      return { questionIdx: a.questionIdx, answerIdx: a.answerIdx, correct: isCorrect }
    })

    const score = Math.round((correct / questions.length) * 100)
    // Use notaMinima from template if set, otherwise default to 80%
    const notaMinima = template.notaMinima != null ? template.notaMinima : 80
    const passed = score >= notaMinima

    // Save answers with projectId
    for (const r of results) {
      await db.examAnswer.create({
        data: { sStep, questionIdx: r.questionIdx, answerIdx: r.answerIdx, correct: r.correct, projectId: lookupProjectId },
      })
    }

    // Update progress if passed
    if (passed) {
      // Also create EmployeeProgress record for individual step (formación + examen = miniStep 1)
      // This is critical for unlocking step 2 for the employee
      let effectiveZoneId = zoneId || null
      if (body.userId) {
        // If no zoneId provided, find the user's first assigned zone in this project
        if (!effectiveZoneId) {
          const memberRecord = await db.projectMember.findFirst({
            where: { userId: body.userId, projectId: lookupProjectId },
            include: { zones: true },
          })
          if (memberRecord && memberRecord.zones.length > 0) {
            effectiveZoneId = memberRecord.zones[0].zoneId
          }
        }
        if (effectiveZoneId) {
          const existingEP = await db.employeeProgress.findUnique({
            where: { sStep_miniStep_projectId_zoneId_userId: { sStep, miniStep: 1, projectId: lookupProjectId, zoneId: effectiveZoneId, userId: body.userId } },
          })
          if (existingEP) {
            await db.employeeProgress.update({
              where: { id: existingEP.id },
              data: { completed: true, score, passedAt: new Date() },
            })
          } else {
            await db.employeeProgress.create({
              data: { sStep, miniStep: 1, completed: true, score, passedAt: new Date(), projectId: lookupProjectId, zoneId: effectiveZoneId, userId: body.userId },
            })
          }
        }
      }

      // Zone-level Progress for step 1: only mark completed when ALL employees in the zone have completed
      if (effectiveZoneId) {
        // Count total employees assigned to this zone
        const totalMembers = await db.memberZone.count({
          where: { zoneId: effectiveZoneId },
        })

        // Count employees who have completed step 1 in this zone
        const completedEmployees = await db.employeeProgress.count({
          where: {
            sStep,
            miniStep: 1,
            projectId: lookupProjectId,
            zoneId: effectiveZoneId,
            completed: true,
          },
        })

        // Step 1 is completed at zone level only when ALL employees have completed it
        const allCompleted = totalMembers > 0 && completedEmployees >= totalMembers

        const existingZoneProgress = await db.progress.findFirst({
          where: { sStep, miniStep: 1, projectId: lookupProjectId, zoneId: effectiveZoneId },
        })
        if (existingZoneProgress) {
          await db.progress.update({
            where: { id: existingZoneProgress.id },
            data: { completed: allCompleted, score, passedAt: allCompleted ? new Date() : undefined },
          })
        } else {
          await db.progress.create({
            data: { sStep, miniStep: 1, completed: allCompleted, score, passedAt: allCompleted ? new Date() : null, projectId: lookupProjectId, zoneId: effectiveZoneId },
          })
        }
      } else {
        // No zone: legacy behavior - just mark as completed
        const findWhere: any = { sStep, miniStep: 1, projectId: lookupProjectId }
        findWhere.zoneId = null

        const existing = await db.progress.findFirst({
          where: findWhere,
        })
        if (existing) {
          await db.progress.update({
            where: { id: existing.id },
            data: { completed: true, score, passedAt: new Date() },
          })
        } else {
          await db.progress.create({
            data: { sStep, miniStep: 1, completed: true, score, passedAt: new Date(), projectId: lookupProjectId, zoneId: null },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score,
        passed,
        notaMinima,
        correctCount: correct,
        totalQuestions: questions.length,
        results,
      },
    })
  } catch (error) {
    console.error('Error submitting exam:', error)
    return NextResponse.json({ success: false, error: 'Error submitting exam' }, { status: 500 })
  }
}
