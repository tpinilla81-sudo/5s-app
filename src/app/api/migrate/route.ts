import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * POST /api/migrate
 * One-time migration endpoint to create the SystemConfig table.
 * This runs raw SQL since Prisma db push can't be called from an API route.
 * After the table is created, this endpoint can be safely removed.
 */
export async function POST() {
  try {
    // Create SystemConfig table if it doesn't exist
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemConfig" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create unique index on key if not exists
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");
    `)

    // Verify the table exists
    const result = await db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "SystemConfig"
    `) as Array<{ count: bigint }>

    return NextResponse.json({
      success: true,
      message: 'SystemConfig table created successfully',
      tableExists: true,
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
