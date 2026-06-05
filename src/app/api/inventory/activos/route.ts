import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory/activos
// Returns all S1 items with category='necesario' (activos/necessary items)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    const where: any = {
      sStep: 1,
      category: 'necesario',
    }
    if (projectId && projectId !== 'undefined') where.projectId = projectId
    if (zoneId && zoneId !== 'undefined') where.zoneId = zoneId

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
      },
    })

    const parsed = items.map(item => ({
      ...item,
      extra: item.extra ? JSON.parse(item.extra) : null,
    }))

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Error fetching activos items:', error)
    return NextResponse.json({ success: false, error: 'Error fetching activos items' }, { status: 500 })
  }
}
