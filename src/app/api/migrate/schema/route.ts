import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

/**
 * POST /api/migrate/schema
 * Adds missing columns to the database schema.
 * Only accessible by gestor (platform owner).
 * Safe to call multiple times — checks if column exists before adding.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor puede ejecutar migraciones' }, { status: 403 })
    }

    const results: string[] = []

    // Add invitationEmailSent column to CompanyMember if it doesn't exist
    try {
      // Try to select the column to see if it exists
      await db.$queryRaw`SELECT "invitationEmailSent" FROM "CompanyMember" LIMIT 1`
      results.push('invitationEmailSent column already exists')
    } catch {
      // Column doesn't exist — add it
      try {
        await db.$executeRaw`ALTER TABLE "CompanyMember" ADD COLUMN "invitationEmailSent" BOOLEAN NOT NULL DEFAULT false`
        results.push('invitationEmailSent column added successfully')
      } catch (alterErr: any) {
        results.push(`Error adding invitationEmailSent: ${alterErr.message || String(alterErr)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migración completada',
      results,
    })
  } catch (error: any) {
    console.error('[MIGRATE] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al ejecutar migración',
      details: error.message || String(error),
    }, { status: 500 })
  }
}
