import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is set - fallback for Railway/container environments
if (!process.env.DATABASE_URL) {
  const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/custom.db`
    : '/home/z/my-project/db/custom.db'
  process.env.DATABASE_URL = `file:${dbPath}`
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// In production, reuse the global instance to avoid connection pool exhaustion with SQLite
// In development, also reuse to avoid hot-reload creating too many connections
const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Ensure we can connect on first use
db.$connect().catch((err) => {
  console.error('Failed to connect to database:', err)
})

export { db }
