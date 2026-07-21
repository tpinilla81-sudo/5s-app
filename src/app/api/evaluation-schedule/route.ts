import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/evaluation-schedule?sStep=1&miniStep=4&projectId=xxx&zoneId=yyy
// Returns the scheduled date/time for an evaluation step
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sStep = searchParams.get('sStep')
    const miniStep = searchParams.get('miniStep')
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    if (!sStep || !miniStep || !projectId) {
      return NextResponse.json({ success: false, error: 'sStep, miniStep, and projectId are required' }, { status: 400 })
    }

    const where: any = {
      sStep: parseInt(sStep),
      miniStep: parseInt(miniStep),
      projectId,
    }
    if (zoneId) where.zoneId = zoneId
    else where.zoneId = null

    const schedule = await db.evaluationSchedule.findFirst({ where })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('Error fetching evaluation schedule:', error)
    return NextResponse.json({ success: false, error: 'Error fetching evaluation schedule' }, { status: 500 })
  }
}

// POST /api/evaluation-schedule — Create or update a scheduled date/time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, projectId, zoneId, fechaProgramada, horaProgramada } = body

    if (!sStep || !miniStep || !projectId) {
      return NextResponse.json({ success: false, error: 'sStep, miniStep, and projectId are required' }, { status: 400 })
    }

    // Use upsert based on the unique constraint
    const where = {
      sStep_miniStep_projectId_zoneId: {
        sStep,
        miniStep,
        projectId,
        zoneId: zoneId || null,
      },
    }

    const schedule = await db.evaluationSchedule.upsert({
      where,
      update: {
        fechaProgramada: fechaProgramada || null,
        horaProgramada: horaProgramada || null,
      },
      create: {
        sStep,
        miniStep,
        projectId,
        zoneId: zoneId || null,
        fechaProgramada: fechaProgramada || null,
        horaProgramada: horaProgramada || null,
      },
    })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('Error saving evaluation schedule:', error)
    return NextResponse.json({ success: false, error: 'Error saving evaluation schedule' }, { status: 500 })
  }
}
