import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const SESSION_COOKIE = '5s_session'
const SESSION_DURATION_DAYS = 7

/**
 * Get the authenticated user from the session cookie (secure token-based).
 * Returns the user object or null if unauthorized/expired.
 */
export async function getAuthUser(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value

  if (!sessionToken) return null

  // Look up the session by token (not by user ID!)
  const session = await db.session.findUnique({
    where: { token: sessionToken },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  })

  if (!session) return null

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      active: true,
    },
  })

  if (!user || !user.active) {
    // User deactivated — clean up their session
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return user
}

/**
 * Verify that the request comes from an authenticated user with view_progress permission.
 * Returns the user object or null if unauthorized.
 * Permission-driven: no hardcoded role checks.
 */
export async function getGerenteUser(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return null

  // Permission-driven: check view_progress permission from DB
  const permConfig = await db.rolePermissionConfig.findUnique({
    where: { role_permission: { role: user.role, permission: 'view_progress' } }
  })
  if (!permConfig?.allowed) return null

  return user
}

/**
 * Generate a cryptographically secure random session token.
 */
export function generateSessionToken(): string {
  const { randomBytes } = require('crypto')
  return randomBytes(32).toString('hex')
}

/**
 * Get session expiry date (7 days from now).
 */
export function getSessionExpiry(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
  return expiresAt
}
