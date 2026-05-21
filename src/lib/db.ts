import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force new client if schema version changes
const SCHEMA_VERSION = 'v2'

export const db =
  (globalForPrisma.prisma && (globalForPrisma as unknown as Record<string, string>).__schemaVer === SCHEMA_VERSION)
    ? globalForPrisma.prisma
    : new PrismaClient({
        log: ['error', 'warn'],
      })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  ;(globalForPrisma as unknown as Record<string, string>).__schemaVer = SCHEMA_VERSION
}