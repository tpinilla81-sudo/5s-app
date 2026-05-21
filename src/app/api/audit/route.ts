import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')

    if (!sStep) {
      return NextResponse.json({ error: 'sStep is required' }, { status: 400 })
    }

    const audits = await db.auditResult.findMany({
      where: { sStep: parseInt(sStep) },
      orderBy: { auditDate: 'desc' },
    })

    return NextResponse.json(audits)
  } catch (error) {
    console.error('Error fetching audits:', error)
    return NextResponse.json({ error: 'Error fetching audits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, auditorName, result, score, observations } = body

    if (!sStep || !auditorName || !result) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const audit = await db.auditResult.create({
      data: {
        sStep,
        auditorName,
        result,
        score: score || null,
        observations: observations || null,
      },
    })

    // If audit passed, update progress
    if (result === 'apto') {
      const existing = await db.progress.findUnique({
        where: { sStep_miniStep: { sStep, miniStep: 5 } },
      })
      if (existing) {
        await db.progress.update({
          where: { sStep_miniStep: { sStep, miniStep: 5 } },
          data: { completed: true, score: score || 100, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep, miniStep: 5, completed: true, score: score || 100, passedAt: new Date() },
        })
      }
    }

    return NextResponse.json(audit)
  } catch (error) {
    console.error('Error creating audit:', error)
    return NextResponse.json({ error: 'Error creating audit' }, { status: 500 })
  }
}
