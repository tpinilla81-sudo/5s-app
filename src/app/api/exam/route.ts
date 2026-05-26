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

    const template = await db.template.findFirst({
      where: { type: 'examen', sStep, active: true },
    })

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
    const passed = score >= 80

    // Save answers with projectId
    for (const r of results) {
      await db.examAnswer.create({
        data: { sStep, questionIdx: r.questionIdx, answerIdx: r.answerIdx, correct: r.correct, projectId: lookupProjectId },
      })
    }

    // Update progress if passed
    if (passed) {
      const findWhere: any = { sStep, miniStep: 1, projectId: lookupProjectId }
      if (zoneId) {
        findWhere.zoneId = zoneId
      } else {
        findWhere.zoneId = null
      }

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
          data: { sStep, miniStep: 1, completed: true, score, passedAt: new Date(), projectId: lookupProjectId, zoneId: zoneId || null },
        })
      }

      // Also create EmployeeProgress record for individual step (formación + examen = miniStep 1)
      if (zoneId && body.userId) {
        const existingEP = await db.employeeProgress.findUnique({
          where: { sStep_miniStep_projectId_zoneId_userId: { sStep, miniStep: 1, projectId: lookupProjectId, zoneId, userId: body.userId } },
        })
        if (existingEP) {
          await db.employeeProgress.update({
            where: { id: existingEP.id },
            data: { completed: true, score, passedAt: new Date() },
          })
        } else {
          await db.employeeProgress.create({
            data: { sStep, miniStep: 1, completed: true, score, passedAt: new Date(), projectId: lookupProjectId, zoneId, userId: body.userId },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score,
        passed,
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
