import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// GET /api/subscriptions - List all subscriptions (gestor only)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const subscriptions = await db.subscription.findMany({
      include: {
        company: { select: { id: true, name: true, active: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, subscriptions })
  } catch (error) {
    console.error('Fetch subscriptions error:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener suscripciones' }, { status: 500 })
  }
}

// POST /api/subscriptions - Create subscription (gestor only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { companyId, plan, status, maxUsers, maxProjects, price, startDate, endDate, trialEndsAt, notes } = body

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 })
    }

    // Check company exists
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return NextResponse.json({ success: false, error: 'Empresa no encontrada' }, { status: 404 })
    }

    // Check if subscription already exists
    const existing = await db.subscription.findUnique({ where: { companyId } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Esta empresa ya tiene una suscripción' }, { status: 400 })
    }

    const subscription = await db.subscription.create({
      data: {
        companyId,
        plan: plan || 'gratuito',
        status: status || 'activa',
        maxUsers: maxUsers || 5,
        maxProjects: maxProjects || 1,
        price: price || 0,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
        notes: notes || null,
      },
      include: {
        company: { select: { id: true, name: true, active: true } },
      },
    })

    return NextResponse.json({ success: true, subscription }, { status: 201 })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json({ success: false, error: 'Error al crear suscripción' }, { status: 500 })
  }
}
