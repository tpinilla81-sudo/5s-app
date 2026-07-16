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

    // Helper: add a column if it doesn't exist
    const addColumnIfMissing = async (table: string, column: string, type: string) => {
      try {
        await db.$queryRawUnsafe(`SELECT "${column}" FROM "${table}" LIMIT 1`)
        results.push(`${table}.${column} already exists`)
      } catch {
        try {
          await db.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`)
          results.push(`${table}.${column} added successfully`)
        } catch (alterErr: any) {
          results.push(`Error adding ${table}.${column}: ${alterErr.message || String(alterErr)}`)
        }
      }
    }

    // CompanyMember columns
    await addColumnIfMissing('CompanyMember', 'invitationEmailSent', 'BOOLEAN NOT NULL DEFAULT false')

    // Company columns - company details
    await addColumnIfMissing('Company', 'nif', 'TEXT')
    await addColumnIfMissing('Company', 'sector', 'TEXT')
    await addColumnIfMissing('Company', 'address', 'TEXT')
    await addColumnIfMissing('Company', 'city', 'TEXT')
    await addColumnIfMissing('Company', 'province', 'TEXT')
    await addColumnIfMissing('Company', 'postalCode', 'TEXT')
    await addColumnIfMissing('Company', 'country', 'TEXT')
    await addColumnIfMissing('Company', 'phone', 'TEXT')
    await addColumnIfMissing('Company', 'website', 'TEXT')

    // Company columns - billing details
    await addColumnIfMissing('Company', 'billingEmail', 'TEXT')
    await addColumnIfMissing('Company', 'billingName', 'TEXT')
    await addColumnIfMissing('Company', 'billingNif', 'TEXT')
    await addColumnIfMissing('Company', 'billingAddress', 'TEXT')
    await addColumnIfMissing('Company', 'billingCity', 'TEXT')
    await addColumnIfMissing('Company', 'billingPostalCode', 'TEXT')
    await addColumnIfMissing('Company', 'iban', 'TEXT')

    // Company columns - contact person
    await addColumnIfMissing('Company', 'contactName', 'TEXT')
    await addColumnIfMissing('Company', 'contactEmail', 'TEXT')
    await addColumnIfMissing('Company', 'contactPhone', 'TEXT')

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
