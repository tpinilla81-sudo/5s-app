import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/migrate — Run database migrations
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

    // Also run schema migrations from /api/migrate/schema
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

    // Company columns
    await addColumnIfMissing('Company', 'nif', 'TEXT')
    await addColumnIfMissing('Company', 'sector', 'TEXT')
    await addColumnIfMissing('Company', 'address', 'TEXT')
    await addColumnIfMissing('Company', 'city', 'TEXT')
    await addColumnIfMissing('Company', 'province', 'TEXT')
    await addColumnIfMissing('Company', 'postalCode', 'TEXT')
    await addColumnIfMissing('Company', 'country', 'TEXT')
    await addColumnIfMissing('Company', 'phone', 'TEXT')
    await addColumnIfMissing('Company', 'website', 'TEXT')
    await addColumnIfMissing('Company', 'billingEmail', 'TEXT')
    await addColumnIfMissing('Company', 'billingName', 'TEXT')
    await addColumnIfMissing('Company', 'billingNif', 'TEXT')
    await addColumnIfMissing('Company', 'billingAddress', 'TEXT')
    await addColumnIfMissing('Company', 'billingCity', 'TEXT')
    await addColumnIfMissing('Company', 'billingPostalCode', 'TEXT')
    await addColumnIfMissing('Company', 'iban', 'TEXT')
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
