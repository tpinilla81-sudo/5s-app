
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const S_STEPS = [1, 2, 3, 4, 5];
const MINI_STEPS = [1, 2, 3, 4, 5];
const MINI_STEP_ACTIONS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2
};

const PER_S_PERMISSIONS = [];
for (const s of S_STEPS) {
  for (const ms of MINI_STEPS) {
    for (let aIdx = 0; aIdx < 2; aIdx++) {
      PER_S_PERMISSIONS.push(`s${s}_step${ms}_a${aIdx}`);
    }
  }
}

const PLATFORM_PERMISSIONS = [
  'platform_create_company', 'platform_edit_company', 'platform_delete_company',
  'platform_view_companies', 'platform_activate_company', 'platform_assign_admin',
  'platform_remove_admin', 'platform_reset_admin_pwd', 'platform_view_all_users',
  'platform_edit_users', 'platform_manage_contracts', 'platform_view_contracts',
  'platform_manage_subscriptions', 'platform_set_company_limits', 'platform_config',
  'platform_manage_templates', 'platform_view_stats', 'platform_send_notifications',
];

const PROJECT_GENERAL_PERMISSIONS = [
  'view_board', 'view_progress', 'view_project', 'edit_project', 'manage_zones',
  'view_team', 'add_members', 'remove_members', 'change_roles',
  'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
  'delete_project', 'reset_data', 'manage_templates', 'skip_steps',
  'notify_audit', 'accept_audit_meeting',
];

const ALL_PERMISSIONS = [...PLATFORM_PERMISSIONS, ...PER_S_PERMISSIONS, ...PROJECT_GENERAL_PERMISSIONS];

const DEFAULT_PERMISSIONS = {
  gestor: [...PLATFORM_PERMISSIONS],
  admin: [
    ...PROJECT_GENERAL_PERMISSIONS,
    ...PER_S_PERMISSIONS.filter(id => id.endsWith('_a0')),
  ],
  gerente: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'edit_project', 'manage_zones', 'accept_audit_meeting',
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true;
      if (id.match(/^s[23]_step3_a1$/)) return true;
      return false;
    }),
  ],
  responsable: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'edit_project', 'manage_zones', 'add_members', 'remove_members', 'change_roles',
    'manage_training', 'delete_photos', 'delete_inventory', 'approve_audit',
    'accept_audit_meeting',
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true;
      if (id.match(/_step5_a1$/)) return false;
      return true;
    }),
  ],
  empleado: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'notify_audit',
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true;
      if (id.match(/_step5_a1$/)) return false;
      return true;
    }),
  ],
  auditor: [
    'view_board', 'view_progress', 'view_project', 'view_team',
    'approve_audit', 'accept_audit_meeting',
    ...PER_S_PERMISSIONS.filter(id => {
      if (id.endsWith('_a0')) return true;
      if (id.match(/_step5_a1$/)) return true;
      return false;
    }),
  ],
};

async function main() {
  // Delete all existing
  await db.rolePermissionConfig.deleteMany({});
  console.log("Deleted all existing permissions");
  
  // Create in batches of 50
  const allCreates = [];
  for (const [role, defaultPerms] of Object.entries(DEFAULT_PERMISSIONS)) {
    for (const permission of ALL_PERMISSIONS) {
      const allowed = defaultPerms.includes(permission);
      allCreates.push({ role, permission, allowed });
    }
  }
  
  // Batch insert
  for (let i = 0; i < allCreates.length; i += 50) {
    const batch = allCreates.slice(i, i + 50);
    await db.$transaction(
      batch.map(d => db.rolePermissionConfig.create({ data: d }))
    );
    process.stdout.write(".");
  }
  console.log(`\nCreated ${allCreates.length} permission records`);
  
  // Verify
  const adminA1 = await db.rolePermissionConfig.count({
    where: { role: 'admin', permission: { endsWith: '_a1' }, allowed: true }
  });
  const adminA0 = await db.rolePermissionConfig.count({
    where: { role: 'admin', permission: { endsWith: '_a0' }, allowed: true }
  });
  console.log(`Admin: _a1(exec)=${adminA1} (should be 0), _a0(view)=${adminA0} (should be 25)`);
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());
