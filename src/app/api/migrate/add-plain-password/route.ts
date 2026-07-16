import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/migrate/add-plain-password — Add plainPassword column to User table
export async function POST(request: NextRequest) {
  try {
    const results: string[] = []

    // Add plainPassword column to User table
    try {
      await db.$queryRawUnsafe(`SELECT "plainPassword" FROM "User" LIMIT 1`)
      results.push('User.plainPassword already exists')
    } catch {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "plainPassword" TEXT`)
        results.push('User.plainPassword added successfully')
      } catch (alterErr: any) {
        results.push(`Error adding User.plainPassword: ${alterErr.message || String(alterErr)}`)
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
