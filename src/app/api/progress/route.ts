import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// Helper: serialize Prisma results (convert BigInt/Date to safe JSON)
function safeJsonify(data: any): any {
  return JSON.parse(JSON.stringify(data, (_, v) =>
    typeof v === 'bigint' ? Number(v) :
    v instanceof Date ? v.toISOString() :
    v
  ))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (zoneId) where.zoneId = zoneId

    const progress = await db.progress.findMany({
      where,
      orderBy: [{ sStep: 'asc' }, { miniStep: 'asc' }],
      // Exclude photoUrls from list endpoint — photos are loaded on demand
      // This prevents 600KB+ responses that cause client timeouts
      select: {
        id: true,
        sStep: true,
        miniStep: true,
        completed: true,
        score: true,
        notes: true,
        passedAt: true,
        projectId: true,
        zoneId: true,
        createdAt: true,
        updatedAt: true,
        // photoUrls excluded — too large for list view
      },
    })

    const safeData = safeJsonify(progress)
    const body = JSON.stringify({ success: true, data: safeData })
    
    return new Response(body, {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
      },
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    const body = JSON.stringify({ success: false, error: 'Error fetching progress' })
    return new Response(body, {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sStep, miniStep, completed, score, notes, photoUrls, projectId, zoneId } = body

    if (!sStep || !miniStep) {
      const body = JSON.stringify({ success: false, error: 'sStep and miniStep are required' })
      return new Response(body, { status: 400, headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) } })
    }

    const lookupProjectId = projectId
    if (!lookupProjectId) {
      const body = JSON.stringify({ success: false, error: 'projectId is required. No project selected.' })
      return new Response(body, { status: 400, headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) } })
    }

    const findWhere: any = {
      sStep,
      miniStep,
      projectId: lookupProjectId,
    }
    if (zoneId) {
      findWhere.zoneId = zoneId
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
          completed: completed ?? existing.completed,
          score: score ?? existing.score,
          notes: notes ?? existing.notes,
          photoUrls: photoUrls ?? existing.photoUrls,
          passedAt: completed && !existing.completed ? new Date() : existing.passedAt,
        },
      })
    } else {
      result = await db.progress.create({
        data: {
          sStep,
          miniStep,
          completed: completed ?? false,
          score,
          notes,
          photoUrls,
          projectId: lookupProjectId,
          zoneId: zoneId || null,
          passedAt: completed ? new Date() : null,
        },
      })
    }

    const safeData = safeJsonify(result)
    const resBody = JSON.stringify({ success: true, data: safeData })
    return new Response(resBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(resBody)) },
    })
  } catch (error) {
    console.error('Error updating progress:', error)
    const body = JSON.stringify({ success: false, error: 'Error updating progress' })
    return new Response(body, {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)) },
    })
  }
}
