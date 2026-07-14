import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL points to Neon PostgreSQL (not SQLite from parent env)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const match = envContent.match(/^DATABASE_URL="(.+)"$/m)
      if (match && match[1].startsWith('postgresql://')) {
        process.env.DATABASE_URL = match[1]
      }
    }
  } catch (e) {
    // Ignore
  }
}

// Also load DATABASE_URL_UNPOOLED for Prisma migrations
if (!process.env.DATABASE_URL_UNPOOLED) {
  try {
    const envPath = path.join(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const match = envContent.match(/^DATABASE_URL_UNPOOLED="(.+)"$/m)
      if (match) {
        process.env.DATABASE_URL_UNPOOLED = match[1]
      }
    }
  } catch (e) {
    // Ignore
  }
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

// Always reuse the global instance to prevent connection pool exhaustion with Neon
// In dev, hot-reload can create many instances; in prod, serverless can too
const db = globalForPrisma.prisma ?? createPrismaClient()

// Store globally regardless of environment
globalForPrisma.prisma = db

export { db }
