import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-helpers'

// ═══════════════════════════════════════════════════════════════════
// TWO-TIER PERMISSION SYSTEM
// ═══════════════════════════════════════════════════════════════════
// Tier 1: PLATFORM permissions (gestor manages the app)
//   - What the gestor can do regarding the platform
//   - What the gestor allows/restricts for each admin de empresa
//   - Contracts, subscriptions, company limits, etc.
//
// Tier 2: PROJECT permissions (admin manages their company)
//   - What each role can do inside a project
//   - Only the admin de empresa can configure these
//   - The gestor does NOT touch these (each company is independent)
// ═══════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════
// PER-S PERMISSION DEFINITIONS (PROJECT TIER)
// ═════════════════════════════════════════════════════════
const S_STEPS = [1, 2, 3, 4, 5]
const MINI_STEPS = [1, 2, 3, 4, 5]
const MINI_STEP_ACTIONS: Record<number, string[]> = {
  1: ['Ver formación', 'Completar formación'],
  2: ['Ver fotos', 'Subir fotos'],
  3: ['Ver inventario', 'Editar inventario'],
  4: ['Ver autoevaluación', 'Realizar autoevaluación'],
  5: ['Ver auditoría', 'Realizar auditoría'],
}

// Build all per-S permission IDs
const PER_S_PERMISSIONS: string[] = []
for (const s of S_STEPS) {
  for (const ms of MINI_STEPS) {
    const actions = MINI_STEP_ACTIONS[ms]
    actions.forEach((_, aIdx) => {
      PER_S_PERMISSIONS.push(`s${s}_step${ms}_a${aIdx}`)
    })
  }
}

// ═════════════════════════════════════════════════════════
// TIER 1: PLATFORM PERMISSIONS (gestor level)
// ═════════════════════════════════════════════════════════
const PLATFORM_PERMISSIONS = [
  // Company management
  'platform_create_company',     // Crear empresas
  'platform_edit_company',       // Editar empresas
  'platform_delete_company',     // Eliminar empresas
  'platform_view_companies',     // Ver todas las empresas
  'platform_activate_company',   // Activar/desactivar empresas
  // Admin management
  'platform_assign_admin',       // Asignar admin a empresa
  'platform_remove_admin',       // Quitar admin de empresa
  'platform_reset_admin_pwd',    // Resetear contraseña de admin
  'platform_view_all_users',     // Ver todos los usuarios de la plataforma
  'platform_edit_users',         // Editar usuarios de la plataforma
  // Contracts & subscriptions
  'platform_manage_contracts',   // Gestionar contratos
  'platform_view_contracts',     // Ver contratos
  'platform_manage_subscriptions', // Gestionar suscripciones
  'platform_set_company_limits', // Definir límites por empresa (usuarios, proyectos, etc.)
  // Platform config
  'platform_config',             // Configurar la plataforma
  'platform_manage_templates',   // Gestionar plantillas globales
  'platform_view_stats',         // Ver estadísticas de la plataforma
  'platform_send_notifications', // Enviar notificaciones globales
]

// ═════════════════════════════════════════════════════════
// TIER 2: PROJECT PERMISSIONS (admin de empresa level)
// ═════════════════════════════════════════════════════════
const PROJECT_GENERAL_PERMISSIONS = [
  'view_board', 'view_progress', 'view_project', 'edit_project', 'manage_zones',
  'view_team', 'add_members', 'remove_members', 'change_roles',
  'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
  'delete_project', 'reset_data', 'manage_templates', 'skip_steps',
  'notify_audit', 'accept_audit_meeting',
]

const ALL_PERMISSIONS = [...PLATFORM_PERMISSIONS, ...PER_S_PERMISSIONS, ...PROJECT_GENERAL_PERMISSIONS]
const ALL_ROLES = ['gestor', 'admin', 'gerente', 'responsable', 'empleado', 'auditor']

// ═════════════════════════════════════════════════════════
// DEFAULT PERMISSIONS
// ═════════════════════════════════════════════════════════
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  // GESTOR: full platform access, NO project-level access (manages platform, not projects)
  gestor: [
    ...PLATFORM_PERMISSIONS, // All platform permissions
  ],

  // ADMIN DE EMPRESA: manages company/projects/users, does NOT execute 5S steps
  // Can VIEW everything (a0) but cannot EXECUTE any 5S step (a1)
  // Only gestor can change admin permissions
  admin: [
    // Project management (full control over company structure)
    'view_board', 'view_progress', 'view_project', 'edit_project', 'manage_zones',
    'view_team', 'add_members', 'remove_members', 'change_roles',
    'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
    'delete_project', 'reset_data', 'manage_templates', 'skip_steps',
    'notify_audit', 'accept_audit_meeting',
    // S-steps: VIEW only (a0), cannot execute (a1)
    ...PER_S_PERMISSIONS.filter(id => id.endsWith('_a0')),
  ],

  gerente: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'edit_project', 'manage_zones', 'accept_audit_meeting',
    // S-steps: can view all mini-steps, can edit inventory
    ...PER_S_PERMISSIONS.filter(id => {
      // All "view" actions (a0)
      if (id.endsWith('_a0')) return true
      // Edit inventory for S2 and S3
      if (id.match(/^s[23]_step3_a1$/)) return true
      return false
    }),
  ],

  responsable: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'edit_project', 'manage_zones', 'add_members', 'remove_members', 'change_roles',
    'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
    'accept_audit_meeting',
    // S-steps: can view and execute steps 1-4, but NOT step 5 (conduct audit)
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true // All view
      if (id.match(/_step5_a1$/)) return false // Cannot conduct audits
      return true // Can execute steps 1-4
    }),
  ],

  empleado: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'notify_audit',
    // S-steps: can view all, can execute steps 1-4, can only view step 5
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true // All view
      if (id.match(/_step5_a1$/)) return false // Cannot conduct audits
      return true // Can execute steps 1-4
    }),
  ],

  auditor: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'approve_audit', 'accept_audit_meeting',
    // S-steps: can view all, can conduct audits (step 5 a1), but NOT execute steps 1-4
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true // All view
      if (id.match(/_step5_a1$/)) return true // Can conduct audits
      return false // Cannot execute steps 1-4
    }),
  ]
}

// GET /api/permissions
export async function GET() {
  try {
    let configs = await db.rolePermissionConfig.findMany()

    // Ensure all expected permissions exist in DB using UPSERT (preserve custom edits!)
    const existingPermIds = new Set(configs.map(c => `${c.role}::${c.permission}`))
    const upsertPromises: Promise<unknown>[] = []

    for (const [role, defaultPerms] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const permission of ALL_PERMISSIONS) {
        const key = `${role}::${permission}`
        if (!existingPermIds.has(key)) {
          // Only create missing permissions with default value - NEVER overwrite existing customizations
          const allowed = defaultPerms.includes(permission)
          upsertPromises.push(
            db.rolePermissionConfig.upsert({
              where: { role_permission: { role, permission } },
              update: {}, // Don't change existing values
              create: { role, permission, allowed },
            })
          )
        }
      }
    }

    if (upsertPromises.length > 0) {
      await Promise.all(upsertPromises)
      configs = await db.rolePermissionConfig.findMany()
    }

    // Clean up stale/old-format permissions that no longer exist in the current system
    const allValidPermIds = new Set(ALL_PERMISSIONS)
    const staleConfigs = configs.filter(c => !allValidPermIds.has(c.permission))
    if (staleConfigs.length > 0) {
      const deletePromises = staleConfigs.map(c =>
        db.rolePermissionConfig.deleteMany({
          where: { role: c.role, permission: c.permission },
        })
      )
      await Promise.all(deletePromises)
      configs = await db.rolePermissionConfig.findMany()
    }

    // Group by role
    // Also clean up stale roles not in ALL_ROLES
    const validRoles = new Set(ALL_ROLES)
    const staleRoles = configs.filter(c => !validRoles.has(c.role))
    if (staleRoles.length > 0) {
      const staleRoleNames = [...new Set(staleRoles.map(c => c.role))]
      for (const role of staleRoleNames) {
        await db.rolePermissionConfig.deleteMany({ where: { role } })
      }
      configs = await db.rolePermissionConfig.findMany()
    }

    const result: Record<string, Record<string, boolean>> = {}
    for (const role of ALL_ROLES) {
      result[role] = {}
    }
    for (const config of configs) {
      if (!result[config.role]) result[config.role] = {}
      result[config.role][config.permission] = config.allowed
    }

    return NextResponse.json({ permissions: result }, { status: 200 })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json({ error: 'Error al obtener permisos' }, { status: 500 })
  }
}

// PUT /api/permissions
export async function PUT(request: NextRequest) {
  try {
    // Only gestor or admin can modify permissions
    const user = await getAuthUser(request)
    if (!user || (user.role !== 'gestor' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { permissions } = body as { permissions: Record<string, Record<string, boolean>> }

    if (!permissions) {
      return NextResponse.json({ error: 'Se requiere el objeto permissions' }, { status: 400 })
    }

    const updatePromises: Promise<unknown>[] = []

    for (const [role, perms] of Object.entries(permissions)) {
      if (!ALL_ROLES.includes(role)) continue

      for (const [permission, allowed] of Object.entries(perms)) {
        if (!ALL_PERMISSIONS.includes(permission)) continue

        // Admin cannot modify their own role's permissions — only gestor can
        if (user.role === 'admin' && role === 'admin') continue

        updatePromises.push(
          db.rolePermissionConfig.upsert({
            where: {
              role_permission: { role, permission },
            },
            update: { allowed: Boolean(allowed) },
            create: { role, permission, allowed: Boolean(allowed) },
          })
        )
      }
    }

    await Promise.all(updatePromises)

    // Return updated config
    const configs = await db.rolePermissionConfig.findMany()
    const result: Record<string, Record<string, boolean>> = {}
    for (const role of ALL_ROLES) {
      result[role] = {}
    }
    for (const config of configs) {
      if (!result[config.role]) result[config.role] = {}
      result[config.role][config.permission] = config.allowed
    }

    return NextResponse.json({ permissions: result }, { status: 200 })
  } catch (error) {
    console.error('Update permissions error:', error)
    return NextResponse.json({ error: 'Error al actualizar permisos' }, { status: 500 })
  }
}

// POST /api/permissions - Reset to defaults
export async function POST(request: NextRequest) {
  try {
    // Only gestor can reset permissions
    const user = await getAuthUser(request)
    if (!user || user.role !== 'gestor') {
      return NextResponse.json({ error: 'Solo el gestor puede restaurar permisos' }, { status: 403 })
    }
    await db.rolePermissionConfig.deleteMany({})

    const createPromises: Promise<unknown>[] = []
    for (const [role, perms] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const permission of ALL_PERMISSIONS) {
        const allowed = perms.includes(permission)
        createPromises.push(
          db.rolePermissionConfig.create({
            data: { role, permission, allowed },
          })
        )
      }
    }
    await Promise.all(createPromises)

    const configs = await db.rolePermissionConfig.findMany()
    const result: Record<string, Record<string, boolean>> = {}
    for (const config of configs) {
      if (!result[config.role]) result[config.role] = {}
      result[config.role][config.permission] = config.allowed
    }

    return NextResponse.json({ permissions: result }, { status: 200 })
  } catch (error) {
    console.error('Reset permissions error:', error)
    return NextResponse.json({ error: 'Error al restaurar permisos' }, { status: 500 })
  }
}
