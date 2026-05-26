import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/companies/[companyId]/members - List company members (gerentes)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const members = await db.companyMember.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        companyId: m.companyId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    })
  } catch (error) {
    console.error('Get company members error:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener miembros' }, { status: 500 })
  }
}

// POST /api/companies/[companyId]/members - Add member to company (assign gerente)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Solo administradores pueden asignar gerentes' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId es requerido' }, { status: 400 })
    }

    // Check user exists and has gerente role
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Upsert membership
    const member = await db.companyMember.upsert({
      where: {
        userId_companyId: { userId, companyId },
      },
      create: {
        userId,
        companyId,
        role: role || 'gerente',
      },
      update: {
        role: role || 'gerente',
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
      },
    })

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        userId: member.userId,
        companyId: member.companyId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Add company member error:', error)
    return NextResponse.json({ success: false, error: 'Error al agregar miembro' }, { status: 500 })
  }
}

// DELETE /api/companies/[companyId]/members - Remove member from company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: sessionId } })
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Solo administradores pueden eliminar miembros' }, { status: 403 })
    }

    const body = await request.json()
    const { memberUserId } = body

    if (!memberUserId) {
      return NextResponse.json({ success: false, error: 'memberUserId es requerido' }, { status: 400 })
    }

    await db.companyMember.deleteMany({
      where: { userId: memberUserId, companyId },
    })

    return NextResponse.json({ success: true, message: 'Miembro eliminado de la empresa' })
  } catch (error) {
    console.error('Remove company member error:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar miembro' }, { status: 500 })
  }
}
