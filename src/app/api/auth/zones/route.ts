import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// Helper: check if user has a specific permission via rolePermissionConfig
async function hasPermission(role: string, permission: string): Promise<boolean> {
  const config = await db.rolePermissionConfig.findUnique({
    where: { role_permission: { role, permission } }
  })
  return config?.allowed === true
}

// GET /api/auth/zones - Get the zones assigned to the current logged-in user (permission-driven)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ zones: [] }, { status: 200 })
    }

    // Get user's project memberships
    const memberships = await db.projectMember.findMany({
      where: { userId: user.id },
      select: { projectId: true },
    })
    const projectIds = memberships.map(m => m.projectId)

    // Permission-driven zone access: manage_zones → all zones
    if (await hasPermission(user.role, 'manage_zones')) {
      const allZones = await db.zone.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          projectId: true,
          responsableId: true,
          boardConfigId: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json({ zones: allZones, role: user.role }, { status: 200 })
    }

    // view_board permission: show assigned zones, or all if none assigned
    if (await hasPermission(user.role, 'view_board')) {
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
              boardConfigId: true,
            },
          },
        },
        orderBy: { assignedAt: 'asc' },
      })

      const assignedZones = memberZones.map(mz => mz.zone)

      // If user has no assigned zones, return all project zones (so they can still work)
      if (assignedZones.length === 0 && projectIds.length > 0) {
        const allZones = await db.zone.findMany({
          where: { projectId: { in: projectIds } },
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            projectId: true,
            responsableId: true,
            boardConfigId: true,
          },
          orderBy: { createdAt: 'asc' },
        })
        return NextResponse.json({ zones: allZones, role: user.role }, { status: 200 })
      }

      return NextResponse.json({ zones: assignedZones, role: user.role }, { status: 200 })
    }

    // No relevant permissions: only assigned zones via MemberZone
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
            boardConfigId: true,
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
