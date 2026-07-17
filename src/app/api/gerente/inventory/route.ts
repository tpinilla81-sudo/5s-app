import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGerenteUser } from '@/lib/auth-helpers'

/**
 * GET /api/gerente/inventory?company=Empresa+Demo&category=innecesario&projectId=xxx&sStep=1
 *
 * Returns all inventory items across all projects of a company,
 * with project info and zone responsable attached, filterable by category, project, S-step.
 * Includes money parked calculation for unnecessary items.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getGerenteUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const company = searchParams.get('company')
    const category = searchParams.get('category')
    const projectId = searchParams.get('projectId')
    const sStep = searchParams.get('sStep')
    const search = searchParams.get('search')

    if (!company) {
      return NextResponse.json({ success: false, error: 'company parameter is required' }, { status: 400 })
    }

    // Get all projects for this company with zones and responsable info
    const projects = await db.project.findMany({
      where: { company },
      select: {
        id: true,
        name: true,
        company: true,
        zones: {
          select: {
            id: true,
            name: true,
            color: true,
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
        },
      },
    })

    const projectIds = projects.map(p => p.id)

    // Build where clause
    const where: any = { projectId: { in: projectIds } }
    if (category) where.category = category
    if (projectId) where.projectId = projectId
    if (sStep) where.sStep = parseInt(sStep)
    if (search) where.name = { contains: search }

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Attach project and zone info with responsable
    const projectMap = new Map(projects.map(p => [p.id, p]))

    const enrichedItems = items.map(item => {
      const proj = projectMap.get(item.projectId)
      // Build zones with responsable
      const zonesWithResponsable = proj?.zones.map(z => {
        const resp = z.members.find(m => m.role === 'responsable')
        return {
          id: z.id,
          name: z.name,
          color: z.color,
          responsable: resp ? { id: resp.user.id, name: resp.user.name, email: resp.user.email } : null,
        }
      }) || []

      return {
        ...item,
        projectName: proj?.name || 'Desconocido',
        projectZones: zonesWithResponsable,
      }
    })

    // Summary stats
    const totalItems = items.length
    const byCategory = {
      innecesario: items.filter(i => i.category === 'innecesario').length,
      dudoso: items.filter(i => i.category === 'dudoso').length,
      util: items.filter(i => i.category === 'util').length,
    }

    const dineroParado = items
      .filter(i => i.category === 'innecesario' || i.category === 'dudoso')
      .reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

    // Items with estimated value
    const itemsWithValue = items.filter(i => i.price && i.price > 0)
    const totalValue = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedItems,
        total: totalItems,
        byCategory,
        dineroParado: Math.round(dineroParado * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        itemsWithValueCount: itemsWithValue.length,
        projects: projects.map(p => ({
          id: p.id,
          name: p.name,
          zones: p.zones.map(z => ({
            id: z.id,
            name: z.name,
            color: z.color,
            responsable: z.members.find(m => m.role === 'responsable')?.user.name || null,
          })),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching gerente inventory:', error)
    return NextResponse.json({ success: false, error: 'Error fetching gerente inventory' }, { status: 500 })
  }
}

/**
 * PUT /api/gerente/inventory
 *
 * Update an inventory item (e.g., add estimated value, change category)
 */
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const user = await getGerenteUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, price, category, action, notas } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Inventory item id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (price !== undefined) updateData.price = price
    if (category !== undefined) updateData.category = category
    if (action !== undefined) updateData.action = action

    const updated = await db.inventoryItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating gerente inventory:', error)
    return NextResponse.json({ success: false, error: 'Error updating gerente inventory' }, { status: 500 })
  }
}
