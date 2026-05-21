import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, answers } = body // answers: { questionIdx, answerIdx }[]

    if (!sStep || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get exam template
    const template = await db.template.findFirst({
      where: { type: 'examen', sStep, active: true },
    })

    if (!template) {
      return NextResponse.json({ error: 'No exam template found for this S' }, { status: 404 })
    }

    const questions = JSON.parse(template.content) as Array<{
      question: string
      options: string[]
      correctAnswer: number
    }>

    let correct = 0
    const results = answers.map((a: { questionIdx: number; answerIdx: number }) => {
      const isCorrect = questions[a.questionIdx]?.correctAnswer === a.answerIdx
      if (isCorrect) correct++
      return { questionIdx: a.questionIdx, answerIdx: a.answerIdx, correct: isCorrect }
    })

    const score = Math.round((correct / questions.length) * 100)
    const passed = score >= 80

    // Save answers
    for (const r of results) {
      await db.examAnswer.create({
        data: { sStep, questionIdx: r.questionIdx, answerIdx: r.answerIdx, correct: r.correct },
      })
    }

    // Update progress if passed
    if (passed) {
      const existing = await db.progress.findUnique({
        where: { sStep_miniStep: { sStep, miniStep: 1 } },
      })
      if (existing) {
        await db.progress.update({
          where: { sStep_miniStep: { sStep, miniStep: 1 } },
          data: { completed: true, score, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep, miniStep: 1, completed: true, score, passedAt: new Date() },
        })
      }
    }

    return NextResponse.json({ score, passed, results, total: questions.length, correct })
  } catch (error) {
    console.error('Error submitting exam:', error)
    return NextResponse.json({ error: 'Error submitting exam' }, { status: 500 })
  }
}
