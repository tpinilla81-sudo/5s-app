import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const projectId = searchParams.get('projectId')

    if (!sStep) {
      return NextResponse.json({ success: false, error: 'sStep is required' }, { status: 400 })
    }

    const where: any = { sStep: parseInt(sStep) }
    if (projectId) where.projectId = projectId

    const audits = await db.auditResult.findMany({
      where,
      orderBy: { auditDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: audits })
  } catch (error) {
    console.error('Error fetching audits:', error)
    return NextResponse.json({ success: false, error: 'Error fetching audits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, auditorName, result, score, observations, projectId } = body

    if (!sStep || !auditorName || !result) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const lookupProjectId = projectId || 'default'

    const audit = await db.auditResult.create({
      data: {
        sStep,
        auditorName,
        result,
        score: score || null,
        observations: observations || null,
        projectId: lookupProjectId,
      },
    })

    // If audit passed (apto), update progress for mini-step 5
    if (result === 'apto') {
      const existing = await db.progress.findUnique({
        where: { sStep_miniStep_projectId: { sStep, miniStep: 5, projectId: lookupProjectId } },
      })
      if (existing) {
        await db.progress.update({
          where: { id: existing.id },
          data: { completed: true, score: score || 100, passedAt: new Date() },
        })
      } else {
        await db.progress.create({
          data: { sStep, miniStep: 5, completed: true, score: score || 100, passedAt: new Date(), projectId: lookupProjectId },
        })
      }
    }

    return NextResponse.json({ success: true, data: audit })
  } catch (error) {
    console.error('Error creating audit:', error)
    return NextResponse.json({ success: false, error: 'Error creating audit' }, { status: 500 })
  }
}
