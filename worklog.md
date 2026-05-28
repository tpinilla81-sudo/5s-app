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
