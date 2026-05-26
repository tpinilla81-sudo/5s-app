import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth/zones - Get the zones assigned to the current logged-in user
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('5s_session')?.value
    if (!sessionId) {
      return NextResponse.json({ zones: [] }, { status: 200 })
    }

    const user = await db.user.findUnique({
      where: { id: sessionId },
      select: { id: true, role: true, active: true },
    })

    if (!user || !user.active) {
      return NextResponse.json({ zones: [] }, { status: 200 })
    }

    // Admin and responsable can see all zones in their projects
    if (user.role === 'admin' || user.role === 'responsable') {
      // Get all projects the user is a member of
      const memberships = await db.projectMember.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      })
      const projectIds = memberships.map(m => m.projectId)

      const allZones = await db.zone.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          projectId: true,
          responsableId: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      return NextResponse.json({ zones: allZones, role: user.role }, { status: 200 })
    }

    // For empleado, auditor, gerente: only return their assigned zones via MemberZone
    const memberZones = await db.memberZone.findMany({
      where: {
        member: {
          userId: user.id,
        },
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            projectId: true,
            responsableId: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    })

    const zones = memberZones.map(mz => mz.zone)

    return NextResponse.json({ zones, role: user.role }, { status: 200 })
  } catch (error) {
    console.error('Error fetching user zones:', error)
    return NextResponse.json({ zones: [], error: 'Error al obtener zonas' }, { status: 500 })
  }
}
