import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { execSync } from 'child_process'

/**
 * POST /api/migrate/schema
 * Runs `prisma db push` to sync the Prisma schema with the database.
 * Only accessible by gestor (platform owner).
 * This is a one-time operation to add new columns like invitationEmailSent.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor puede ejecutar migraciones' }, { status: 403 })
    }

    console.log('[MIGRATE] Running prisma db push...')
    const output = execSync('npx prisma db push --accept-data-loss', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env },
    })

    console.log('[MIGRATE] Output:', output)
    return NextResponse.json({ success: true, message: 'Esquema de base de datos actualizado correctamente', output })
  } catch (error: any) {
    console.error('[MIGRATE] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar el esquema',
      details: error.message || String(error),
    }, { status: 500 })
  }
}
