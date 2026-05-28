---
Task ID: 1
Agent: Main Agent
Task: Comprehensive audit and fix of all hardcoded role/permission logic that conflicts with the permission system

Work Log:
- Searched entire codebase for role checks, isAdmin patterns, and permission bypasses
- Found 6 critical locations with `if (currentUser.role === 'admin') return true` that bypassed the permission system entirely
- Found 6 modals with hardcoded `isAdmin = currentUser?.role === 'admin' && adminFreeNavigation` logic
- Found 4 API routes with hardcoded role checks instead of permission checks
- Added `skip_steps` to GENERAL_PERMISSIONS in /api/permissions/route.ts (was missing)
- Added re-seed trigger for missing GENERAL_PERMISSIONS in DB

Key Fixes:
1. **store.ts**: Removed admin bypass from `hasPermission()` and `checkPerm()`. Replaced `isAdmin` with `canSkipSteps = hasPermission('skip_steps')` in `getMiniStepStatus()`
2. **usePermissions.ts**: Removed admin bypass from `hasPermission()`
3. **page.tsx**: Removed admin bypass from local `hasPermission`. Replaced `isAdmin` with `canSkipSteps` for candado logic. Changed zone check from role-based to `hasPermission('manage_zones')`
4. **api/progress/step/route.ts**: Removed admin bypass from `hasPermission()`. Changed DELETE from `user.role !== 'admin'` to permission check (`reset_data` or `skip_steps`)
5. **api/audit/route.ts**: Removed admin bypass - now ALL roles (including admin) are checked via `rolePermissionConfig`
6. **api/auth/zones/route.ts**: Rewrote to be permission-driven using `manage_zones` and `view_board` permissions instead of role names
7. **lib/auth-helpers.ts**: Changed from role check to `view_progress` permission check
8. **6 Modal files** (Autoevaluacion, Formacion, Auditoria, Inventario, Fotos, ActionPlan): Replaced `isAdmin` with `canSkipSteps = hasPermission('skip_steps')`. Changed `isReadOnly` from `(canViewStep && !canPerformStep) || (currentUser?.role === 'admin' && !adminFreeNavigation)` to `!canPerformStep || (canSkipSteps && !adminFreeNavigation)`

Stage Summary:
- All admin bypasses removed from permission checks
- Permission system is now the SINGLE source of truth for all 5S step access
- Admin still has all permissions because DEFAULT_PERMISSIONS grants admin ALL_PERMISSIONS
- The candado (lock open) feature now uses `skip_steps` permission instead of hardcoded admin check
- Build passes successfully with zero errors
- System-level operations (admin panel, user management) correctly remain role-based

---
Task ID: 2
Agent: Main Agent
Task: Fix auditor can access steps 2-4 (only has a0) and can't access step 5 (has a1)

Work Log:
- Identified root cause: getMiniStepStatus() returned 'completed' for ALL completed steps regardless of permissions, making them clickable even for a0-only users
- Introduced new status 'completed_viewonly' for steps that are completed but user only has a0 (view) permission
- Updated getMiniStepStatus() in store.ts: completed steps now check canPerformStep/canSkipSteps before returning 'completed'
- Updated page.tsx board rendering: added canOpenModal flag (only 'completed' or 'available' allow clicking), 'completed_viewonly' shows ✓ but is not clickable
- Updated SStepDetail.tsx: same canOpenModal logic for detail view
- Updated MiniStepCard.tsx: handles 'completed_viewonly' status type, shows green checkmark but cursor-not-allowed and no onClick
- Verified auditor permissions in DB: s{X}_step5_a1=true (can audit), s{X}_step{1-4}_a0=true (view only), no a1 for steps 1-4

Stage Summary:
- Auditor with completed steps 1-4: sees ✓ green (completed_viewonly) on steps 1-4, CAN'T open them
- Auditor with completed steps 1-4: sees step 5 as 'available', CAN open and perform audit
- Build passes successfully
