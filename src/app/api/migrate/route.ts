import { NextResponse } from 'next/server'
import { db, ensureSystemConfigTable } from '@/lib/db'

/**
 * POST /api/migrate
 * One-time migration endpoint to create the SystemConfig table.
 * Also auto-called by the seed endpoint, so this is just a manual fallback.
 */
export async function POST() {
  try {
    await ensureSystemConfigTable()

    const result = await db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "SystemConfig"
    `) as Array<{ count: bigint }>

    return NextResponse.json({
      success: true,
      message: 'SystemConfig table ready',
      rowCount: Number(result[0]?.count ?? 0),
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 })
  }
}
