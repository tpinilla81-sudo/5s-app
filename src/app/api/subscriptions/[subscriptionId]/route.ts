import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// GET /api/subscriptions/[subscriptionId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const { subscriptionId } = await params
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        company: { select: { id: true, name: true, active: true } },
      },
    })

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'Suscripción no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Fetch subscription error:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener suscripción' }, { status: 500 })
  }
}

// PUT /api/subscriptions/[subscriptionId] - Update subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const { subscriptionId } = await params
    const body = await request.json()
    const { plan, status, maxUsers, maxProjects, price, startDate, endDate, trialEndsAt, notes } = body

    const existing = await db.subscription.findUnique({ where: { id: subscriptionId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Suscripción no encontrada' }, { status: 404 })
    }

    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(plan !== undefined && { plan }),
        ...(status !== undefined && { status }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(maxProjects !== undefined && { maxProjects }),
        ...(price !== undefined && { price }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(trialEndsAt !== undefined && { trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        company: { select: { id: true, name: true, active: true } },
      },
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar suscripción' }, { status: 500 })
  }
}

// DELETE /api/subscriptions/[subscriptionId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 })
    }

    const { subscriptionId } = await params
    await db.subscription.delete({ where: { id: subscriptionId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete subscription error:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar suscripción' }, { status: 500 })
  }
}
