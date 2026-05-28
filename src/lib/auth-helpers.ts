import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const SESSION_COOKIE = '5s_session'

/**
 * Verify that the request comes from an authenticated user with view_progress permission.
 * Returns the user object or null if unauthorized.
 * Permission-driven: no hardcoded role checks.
 */
export async function getGerenteUser(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value

  if (!sessionId) return null

  const user = await db.user.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  })

  if (!user || !user.active) return null

  // Permission-driven: check view_progress permission from DB
  const permConfig = await db.rolePermissionConfig.findUnique({
    where: { role_permission: { role: user.role, permission: 'view_progress' } }
  })
  if (!permConfig?.allowed) return null

  return user
}
