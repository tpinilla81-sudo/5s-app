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
        company: true,
      },
    })

    if (!membership) {
      return NextResponse.json({ success: false, error: 'No tienes empresa asignada' }, { status: 404 })
    }

    const c = membership.company
    return NextResponse.json({
      success: true,
      company: {
        id: c.id,
        name: c.name,
        description: c.description,
        active: c.active,
        // Company details
        nif: c.nif,
        sector: c.sector,
        address: c.address,
        city: c.city,
        province: c.province,
        postalCode: c.postalCode,
        country: c.country,
        phone: c.phone,
        website: c.website,
        // Billing
        billingEmail: c.billingEmail,
        billingName: c.billingName,
        billingNif: c.billingNif,
        billingAddress: c.billingAddress,
        billingCity: c.billingCity,
        billingPostalCode: c.billingPostalCode,
        iban: c.iban,
        // Contact
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
      },
    })
  } catch (error) {
    console.error('Error fetching my company:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener datos de empresa' }, { status: 500 })
  }
}

/**
 * PUT /api/my-company
 * Update company data for the authenticated admin user.
 * Admin can fill in missing company details, billing info, etc.
 */
export async function PUT(request: NextRequest) {
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
    })

    if (!membership) {
      return NextResponse.json({ success: false, error: 'No tienes empresa asignada' }, { status: 404 })
    }

    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'nif', 'sector', 'address', 'city', 'province', 'postalCode', 'country',
      'phone', 'website',
      'billingEmail', 'billingName', 'billingNif', 'billingAddress',
      'billingCity', 'billingPostalCode', 'iban',
      'contactName', 'contactEmail', 'contactPhone',
      'description',
    ]

    const data: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]?.trim() || null
      }
    }

    const updated = await db.company.update({
      where: { id: membership.companyId },
      data,
    })

    return NextResponse.json({
      success: true,
      company: {
        id: updated.id,
        name: updated.name,
        nif: updated.nif,
        sector: updated.sector,
        address: updated.address,
        city: updated.city,
        province: updated.province,
        postalCode: updated.postalCode,
        country: updated.country,
        phone: updated.phone,
        website: updated.website,
        billingEmail: updated.billingEmail,
        billingName: updated.billingName,
        billingNif: updated.billingNif,
        billingAddress: updated.billingAddress,
        billingCity: updated.billingCity,
        billingPostalCode: updated.billingPostalCode,
        iban: updated.iban,
        contactName: updated.contactName,
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
      },
    })
  } catch (error) {
    console.error('Error updating my company:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar datos de empresa' }, { status: 500 })
  }
}
