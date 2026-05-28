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

---
Task ID: 3
Agent: Main Agent
Task: Fix progressive unlocking and employee step 1 completion visibility

Work Log:
- Analyzed user screenshot showing S1 step 1 as locked, steps 2-4 as completed (incoherent), and S2-S5 step 1 as available
- Found root cause 1: getMiniStepStatus() had NO progressive unlocking for steps 2-4 — any step with a1 permission was immediately 'available'
- Found root cause 2: Zone-level progress data was incoherent (steps 2,3,4 completed but step 1 not) due to admin skip
- Found root cause 3: Step 1 exam completion only marked zone Progress as completed when ALL employees passed — individual EmployeeProgress was ignored for display
- Found root cause 4: employeeProgress was not fetched during page initialization
- Added isPreviousStepCompleted() helper: step N requires step N-1 completed at zone level (step 2 also unlocks if user completed step 1 individually)
- Added isChainCoherent() check: completed steps are only shown as ✓ if the previous step is also done (prevents visual incoherence from bad data)
- Added hasUserCompletedIndividualStep() helper: checks EmployeeProgress for steps 1 and 4 (individual steps)
- Added isStepDoneForUser(): combines zone-level and individual completion for display
- Updated page.tsx: added fetchEmployeeProgress() call during initialization
- Updated page.tsx: improved lockReason tooltips ("Completa paso X" for progressive, "Completa pasos 1-4" for step 5)
- Fixed 3 incoherent DB records: S1 steps 2,3,4 in zone LAVADO were marked completed but step 1 wasn't

Stage Summary:
- Progressive unlocking now works: step 1 → 2 → 3 → 4 → 5 (sequential within each S)
- Employee who passed step 1 exam sees it as ✓ (completed) even if not all zone employees passed
- Employee who passed step 1 can proceed to step 2 even if zone step 1 isn't fully completed
- Incoherent DB data no longer causes visual bugs (chain coherency check)
- Build passes successfully
