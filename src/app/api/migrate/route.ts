import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

// POST /api/migrate — Apply pending migrations (gestor only)
// This endpoint applies the cascade-delete migration for Project→Company
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }
    if (user.role !== 'gestor') {
      return NextResponse.json({ success: false, error: 'Solo el gestor puede aplicar migraciones' }, { status: 403 })
    }

    // Apply the cascade-delete migration for Project.companyId → Company.id
    // This allows deleting a Company to automatically cascade-delete all its Projects
    const results: string[] = []

    try {
      // Drop existing foreign key and re-add with ON DELETE CASCADE
      await db.$executeRawUnsafe(`
        ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_companyId_fkey";
      `)
      results.push('Dropped existing Project_companyId_fkey constraint')

      await db.$executeRawUnsafe(`
        ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `)
      results.push('Added Project_companyId_fkey with ON DELETE CASCADE')
    } catch (migrationError) {
      const msg = migrationError instanceof Error ? migrationError.message : String(migrationError)
      results.push(`Migration error: ${msg}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Migración aplicada',
      details: results,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error en migración',
    }, { status: 500 })
  }
}
