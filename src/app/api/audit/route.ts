import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')

    const where: any = {}
    if (sStep !== null) where.sStep = parseInt(sStep)
    if (projectId) where.projectId = projectId

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
    const { sStep, auditorName, result, score, observations, projectId } = body

    if (auditorName === undefined || !result) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lookupProjectId = projectId || 'default'
    const sStepValue = sStep !== undefined ? sStep : 0

    const audit = await db.auditResult.create({
      data: {
        sStep: sStepValue,
        auditorName,
        result,
        score: score || null,
        observations: observations || null,
        projectId: lookupProjectId,
      },
    })

    // If audit passed (apto) and sStep is 1-5, update progress for mini-step 5
    // For sStep=0 (quarterly combined audit), no progress update needed
    if (result === 'apto' && sStepValue >= 1 && sStepValue <= 5) {
      const existing = await db.progress.findUnique({
        where: { sStep_miniStep_projectId: { sStep: sStepValue, miniStep: 5, projectId: lookupProjectId } },
      })
      if (existing) {
        await db.progress.update({
          where: { id: existing.id },
          data: { completed: true, score: score || 100, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep: sStepValue, miniStep: 5, completed: true, score: score || 100, passedAt: new Date(), projectId: lookupProjectId },
        })
      }
    }

    return NextResponse.json({ success: true, data: audit })
  } catch (error) {
    console.error('Error creating audit:', error)
    return NextResponse.json({ success: false, error: 'Error creating audit' }, { status: 500 })
  }
}
