import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default permissions configuration - used to seed the database
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'view_board', 'view_progress', 'complete_steps',
    'view_training', 'take_exam', 'manage_training',
    'view_photos', 'upload_photos', 'delete_photos',
    'view_inventory', 'edit_inventory', 'delete_inventory',
    'view_selfeval', 'do_selfeval',
    'view_audits', 'conduct_audit', 'approve_audit',
    'view_project', 'edit_project', 'manage_zones',
    'view_team', 'add_members', 'remove_members', 'change_roles',
    'delete_project', 'reset_data', 'manage_templates',
  ],
  responsable: [
    'view_board', 'view_progress', 'complete_steps',
    'view_training', 'take_exam', 'manage_training',
    'view_photos', 'upload_photos', 'delete_photos',
    'view_inventory', 'edit_inventory', 'delete_inventory',
    'view_selfeval', 'do_selfeval',
    'view_audits', 'conduct_audit', 'approve_audit',
    'view_project', 'edit_project', 'manage_zones',
    'view_team', 'add_members', 'remove_members', 'change_roles',
  ],
  empleado: [
    'view_board', 'view_progress', 'complete_steps',
    'view_training', 'take_exam',
    'view_photos', 'upload_photos',
    'view_inventory', 'edit_inventory',
    'view_selfeval', 'do_selfeval',
    'view_audits',
    'view_project',
    'view_team',
  ],
  auditor: [
    'view_board', 'view_progress',
    'view_training',
    'view_photos',
    'view_inventory',
    'view_selfeval',
    'view_audits', 'conduct_audit', 'approve_audit',
    'view_project',
    'view_team',
  ],
}

// All known permissions (flat list)
const ALL_PERMISSIONS = [
  'view_board', 'view_progress', 'complete_steps',
  'view_training', 'take_exam', 'manage_training',
  'view_photos', 'upload_photos', 'delete_photos',
  'view_inventory', 'edit_inventory', 'delete_inventory',
  'view_selfeval', 'do_selfeval',
  'view_audits', 'conduct_audit', 'approve_audit',
  'view_project', 'edit_project', 'manage_zones',
  'view_team', 'add_members', 'remove_members', 'change_roles',
  'delete_project', 'reset_data', 'manage_templates',
]

const ALL_ROLES = ['admin', 'responsable', 'empleado', 'auditor']

// GET /api/permissions - Get all permissions configuration
export async function GET() {
  try {
    let configs = await db.rolePermissionConfig.findMany()

    // If no configs exist yet, seed with defaults
    if (configs.length === 0) {
      const createPromises: Promise<unknown>[] = []
      for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
        for (const permission of ALL_PERMISSIONS) {
          const allowed = permissions.includes(permission)
          createPromises.push(
            db.rolePermissionConfig.create({
              data: { role, permission, allowed },
            })
          )
        }
      }
      await Promise.all(createPromises)
      configs = await db.rolePermissionConfig.findMany()
    }

    // Group by role
    const result: Record<string, Record<string, boolean>> = {}
    for (const role of ALL_ROLES) {
      result[role] = {}
    }

    for (const config of configs) {
      if (!result[config.role]) {
        result[config.role] = {}
      }
      result[config.role][config.permission] = config.allowed
    }

    return NextResponse.json({ permissions: result }, { status: 200 })
  } catch (error) {
    console.error('Get permissions error:', error)
    return NextResponse.json(
      { error: 'Error al obtener permisos' },
      { status: 500 }
    )
  }
}

// PUT /api/permissions - Update permissions configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { permissions } = body as { permissions: Record<string, Record<string, boolean>> }

    if (!permissions) {
      return NextResponse.json(
        { error: 'Se requiere el objeto permissions' },
        { status: 400 }
      )
    }

    const updatePromises: Promise<unknown>[] = []

    for (const [role, perms] of Object.entries(permissions)) {
      if (!ALL_ROLES.includes(role)) continue

      for (const [permission, allowed] of Object.entries(perms)) {
        if (!ALL_PERMISSIONS.includes(permission)) continue

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
    return NextResponse.json(
      { error: 'Error al actualizar permisos' },
      { status: 500 }
    )
  }
}

// POST /api/permissions - Reset permissions to defaults
export async function POST() {
  try {
    // Delete all existing
    await db.rolePermissionConfig.deleteMany({})

    // Re-seed with defaults
    const createPromises: Promise<unknown>[] = []
    for (const [role, permissions] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const permission of ALL_PERMISSIONS) {
        const allowed = permissions.includes(permission)
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
    return NextResponse.json(
      { error: 'Error al restaurar permisos' },
      { status: 500 }
    )
  }
}
