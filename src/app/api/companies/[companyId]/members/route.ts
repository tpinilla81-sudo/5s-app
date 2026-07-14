import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// GET /api/companies/[companyId]/members - List company members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const user = await getAuthUser(request)
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

// POST /api/companies/[companyId]/members - Add member to company (assign admin/gerente)
// ✅ UPDATED: Ahora también permite al GESTOR (dueño de la app) asignar administradores
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    // ✅ Permite: gestor (dueño app) o admin (admin de empresa)
    if (user.role !== 'gestor' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Solo el gestor o administradores pueden asignar miembros' },
        { status: 403 }
      )
    }

    // Si es admin, solo puede asignar en empresas donde es miembro
    if (user.role === 'admin') {
      const membership = await db.companyMember.findFirst({
        where: { companyId, userId: user.id },
      })
      if (!membership) {
        return NextResponse.json(
          { success: false, error: 'Solo puedes administrar empresas donde eres miembro' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId es requerido' }, { status: 400 })
    }

    // Check user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si el gestor está asignando un admin, asegurar que el usuario tenga rol 'admin'
    const targetRole = role || 'gerente'
    if (user.role === 'gestor' && targetRole === 'admin_empresa' && targetUser.role !== 'admin') {
      await db.user.update({
        where: { id: userId },
        data: { role: 'admin' },
      })
    }

    // Upsert membership
    const member = await db.companyMember.upsert({
      where: {
        userId_companyId: { userId, companyId },
      },
      create: {
        userId,
        companyId,
        role: targetRole,
      },
      update: {
        role: targetRole,
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
// ✅ UPDATED: Ahora también permite al GESTOR eliminar miembros
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    // ✅ Permite: gestor o admin
    if (user.role !== 'gestor' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Solo el gestor o administradores pueden eliminar miembros' },
        { status: 403 }
      )
    }

    // Si es admin, solo puede eliminar en empresas donde es miembro
    if (user.role === 'admin') {
      const membership = await db.companyMember.findFirst({
        where: { companyId, userId: user.id },
      })
      if (!membership) {
        return NextResponse.json(
          { success: false, error: 'Solo puedes administrar empresas donde eres miembro' },
          { status: 403 }
        )
      }
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
