import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory/activos
// Returns all S2 items (Activos/Necessary items organized in Seiton)
// Also includes S1 items with category='necesario' for backwards compatibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const zoneId = searchParams.get('zoneId')

    const baseWhere: any = {
      OR: [
        { sStep: 2 }, // S2 (Seiton) inventory items — Activos
        { sStep: 1, category: 'necesario' }, // S1 items classified as necessary (backwards compat)
      ],
    }
    if (projectId && projectId !== 'undefined') {
      baseWhere.AND = [{ projectId }]
    }
    if (zoneId && zoneId !== 'undefined') {
      baseWhere.AND = [...(baseWhere.AND || []), { zoneId }]
    }

    // Build the full where clause
    const where: any = projectId || zoneId
      ? { AND: [{ OR: baseWhere.OR }, ...(baseWhere.AND || [])] }
      : { OR: baseWhere.OR }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, company: true } },
        zone: { select: { id: true, name: true } },
        photos: true,
      },
    })

    const parsed = items.map(item => ({
      ...item,
      extra: item.extra ? JSON.parse(item.extra) : null,
      photoUrls: item.photoUrls ? JSON.parse(item.photoUrls) : null,
    }))

    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('Error fetching activos items:', error)
    return NextResponse.json({ success: false, error: 'Error fetching activos items' }, { status: 500 })
  }
}
