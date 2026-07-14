/**
 * Cleanup script: Delete all data except the gestor user
 * Run with: npx tsx scripts/cleanup-db.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from project root
config({ path: resolve(__dirname, '..', '.env') })

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🧹 Starting database cleanup...')

  // First, find the gestor user
  const gestor = await db.user.findUnique({ where: { email: 'gestor@cincos.com' } })
  
  if (!gestor) {
    console.log('⚠️  No gestor user found! Creating one...')
    const { createHash } = await import('crypto')
    await db.user.create({
      data: {
        email: 'gestor@cincos.com',
        name: 'Gestor',
        password: createHash('sha256').update('gestor123').digest('hex'),
        role: 'gestor',
        active: true,
      }
    })
    console.log('✅ Gestor user created')
  } else {
    console.log(`✅ Found gestor user: ${gestor.name} (${gestor.email})`)
  }

  // Delete in order respecting foreign key constraints
  console.log('  Deleting sessions...')
  const delSessions = await db.session.deleteMany({})
  console.log(`    → ${delSessions.count} sessions deleted`)

  console.log('  Deleting notifications...')
  const delNotifications = await db.notification.deleteMany({})
  console.log(`    → ${delNotifications.count} notifications deleted`)

  console.log('  Deleting PDCA items...')
  const delPDCA = await db.pDCAItem.deleteMany({})
  console.log(`    → ${delPDCA.count} PDCA items deleted`)

  console.log('  Deleting photo library...')
  const delPhotos = await db.photoLibrary.deleteMany({})
  console.log(`    → ${delPhotos.count} photos deleted`)

  console.log('  Deleting board slot standards...')
  const delSlotStandards = await db.boardSlotStandard.deleteMany({})
  console.log(`    → ${delSlotStandards.count} slot standards deleted`)

  console.log('  Deleting board slot templates...')
  const delSlotTemplates = await db.boardSlotTemplate.deleteMany({})
  console.log(`    → ${delSlotTemplates.count} slot templates deleted`)

  console.log('  Deleting board slots...')
  const delSlots = await db.boardSlot.deleteMany({})
  console.log(`    → ${delSlots.count} slots deleted`)

  console.log('  Deleting board configurations...')
  const delBoards = await db.boardConfiguration.deleteMany({})
  console.log(`    → ${delBoards.count} board configs deleted`)

  console.log('  Deleting standards...')
  const delStandards = await db.standard.deleteMany({})
  console.log(`    → ${delStandards.count} standards deleted`)

  console.log('  Deleting action items...')
  const delActions = await db.actionItem.deleteMany({})
  console.log(`    → ${delActions.count} action items deleted`)

  console.log('  Deleting checklist responses...')
  const delChecklist = await db.checklistResponse.deleteMany({})
  console.log(`    → ${delChecklist.count} checklist responses deleted`)

  console.log('  Deleting audit results...')
  const delAudits = await db.auditResult.deleteMany({})
  console.log(`    → ${delAudits.count} audit results deleted`)

  console.log('  Deleting audit targets...')
  const delAuditTargets = await db.auditTarget.deleteMany({})
  console.log(`    → ${delAuditTargets.count} audit targets deleted`)

  console.log('  Deleting exam answers...')
  const delExams = await db.examAnswer.deleteMany({})
  console.log(`    → ${delExams.count} exam answers deleted`)

  console.log('  Deleting inventory items...')
  const delInventory = await db.inventoryItem.deleteMany({})
  console.log(`    → ${delInventory.count} inventory items deleted`)

  console.log('  Deleting employee progress...')
  const delEmployeeProgress = await db.employeeProgress.deleteMany({})
  console.log(`    → ${delEmployeeProgress.count} employee progress deleted`)

  console.log('  Deleting progress...')
  const delProgress = await db.progress.deleteMany({})
  console.log(`    → ${delProgress.count} progress deleted`)

  console.log('  Deleting member zones...')
  const delMemberZones = await db.memberZone.deleteMany({})
  console.log(`    → ${delMemberZones.count} member zones deleted`)

  console.log('  Deleting project members...')
  const delProjectMembers = await db.projectMember.deleteMany({})
  console.log(`    → ${delProjectMembers.count} project members deleted`)

  console.log('  Deleting zones...')
  const delZones = await db.zone.deleteMany({})
  console.log(`    → ${delZones.count} zones deleted`)

  console.log('  Deleting projects...')
  const delProjects = await db.project.deleteMany({})
  console.log(`    → ${delProjects.count} projects deleted`)

  console.log('  Deleting company members...')
  const delCompanyMembers = await db.companyMember.deleteMany({})
  console.log(`    → ${delCompanyMembers.count} company members deleted`)

  console.log('  Deleting companies...')
  const delCompanies = await db.company.deleteMany({})
  console.log(`    → ${delCompanies.count} companies deleted`)

  console.log('  Deleting templates...')
  const delTemplates = await db.template.deleteMany({})
  console.log(`    → ${delTemplates.count} templates deleted`)

  console.log('  Deleting role permission configs...')
  const delPerms = await db.rolePermissionConfig.deleteMany({})
  console.log(`    → ${delPerms.count} permission configs deleted`)

  // Finally, delete all users except gestor
  console.log('  Deleting non-gestor users...')
  const delUsers = await db.user.deleteMany({
    where: {
      email: { not: 'gestor@cincos.com' }
    }
  })
  console.log(`    → ${delUsers.count} users deleted`)

  // Verify
  const remainingUsers = await db.user.findMany()
  console.log('\n📊 Remaining users:')
  for (const u of remainingUsers) {
    console.log(`   - ${u.name} (${u.email}) - Role: ${u.role} - Active: ${u.active}`)
  }

  console.log('\n✅ Database cleanup complete! Only gestor user remains.')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
