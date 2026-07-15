import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

/**
 * GET /api/my-company
 * Returns the company data for the authenticated admin user.
 * Used by ProjectSetup to pre-fill company info.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    // Find the user's company membership
    const membership = await db.companyMember.findFirst({
      where: {
        userId: user.id,
        OR: [
          { role: 'admin_empresa' },
          { role: 'admin' },
        ],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            nif: true,
            sector: true,
            address: true,
            city: true,
            active: true,
          },
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ success: false, error: 'No tienes empresa asignada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      company: {
        id: membership.company.id,
        name: membership.company.name,
        nif: membership.company.nif,
        sector: membership.company.sector,
        address: membership.company.address,
        city: membership.company.city,
        active: membership.company.active,
      },
    })
  } catch (error) {
    console.error('Error fetching my company:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener datos de empresa' }, { status: 500 })
  }
}
