import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

const SESSION_COOKIE = '5s_session'

/**
 * Verify that the request comes from an authenticated user with gerente or admin role.
 * Returns the user object or null if unauthorized.
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
  if (user.role !== 'gerente' && user.role !== 'admin') return null

  return user
}
