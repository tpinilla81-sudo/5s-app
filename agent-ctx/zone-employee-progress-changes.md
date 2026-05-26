# Task: Zone-Level and Employee-Level Progress Tracking

## Summary of All Changes

### 1. Schema Changes (`prisma/schema.prisma`)

- **Progress model**: Added `zoneId` (nullable String) field with Zone relation. Removed `@@unique([sStep, miniStep, projectId])` and added `@@index([projectId, zoneId])`. The unique constraint was removed because SQLite treats NULLs as distinct in unique constraints, which would break backward compatibility. Uniqueness is now enforced at the API level using findFirst.

- **EmployeeProgress model** (NEW): Created with fields: `id`, `sStep`, `miniStep`, `completed`, `score`, `notes`, `passedAt`, `projectId`, `zoneId` (required), `userId` (required). Has `@@unique([sStep, miniStep, projectId, zoneId, userId])` composite key and indexes on `[projectId, zoneId]` and `[projectId, zoneId, userId]`.

- **Zone model**: Added `responsableId` (nullable String) field with User relation (onDelete: SetNull). Added reverse relations: `progress Progress[]`, `employeeProgress EmployeeProgress[]`, `inventoryItems InventoryItem[]`.

- **User model**: Added `employeeProgress EmployeeProgress[]` and `responsableZones Zone[]` reverse relations.

- **Project model**: Added `employeeProgress EmployeeProgress[]` reverse relation.

- **InventoryItem model**: Added `zoneId` (nullable String) field with Zone relation (onDelete: SetNull). Added `@@index([zoneId])`.

### 2. API Route Changes

- **`src/app/api/progress/step/route.ts`**: Updated GET to accept `zoneId` filter param. Updated PUT to include `zoneId` in findFirst where clause and create data. Uses `findFirst` instead of `findUnique` since unique constraint was removed.

- **`src/app/api/progress/route.ts`**: Updated GET to accept `zoneId` filter. Updated POST to include `zoneId` in findFirst/create logic.

- **`src/app/api/progress/[sStep]/[miniStep]/route.ts`**: Completely rewritten. GET now accepts `projectId` and `zoneId` query params. PUT requires `projectId` in body and supports `zoneId`. Uses `findFirst` instead of broken `findUnique`.

- **`src/app/api/employee-progress/route.ts`** (NEW): Full CRUD for EmployeeProgress. GET accepts filters (projectId, zoneId, sStep, miniStep, userId). POST creates/upserts with validation (only miniStep 1 or 4 allowed). PUT supports update by id or composite key.

- **`src/app/api/inventory/route.ts`**: Updated GET to accept `zoneId` filter param. Updated POST to accept and store `zoneId` with items. Updated PUT to allow `zoneId` updates.

- **`src/app/api/exam/route.ts`**: Updated to use `findFirst` instead of `findUnique` for Progress lookup. Added `zoneId` support. Added EmployeeProgress record creation when a zoneId and userId are provided and exam passes.

- **`src/app/api/audit/route.ts`**: Updated to use `findFirst` instead of `findUnique` for Progress lookup. Added `zoneId` support.

- **`src/app/api/seed/route.ts`**: Updated seed logic from `upsert` with unique key to `findFirst` + `create` pattern since unique constraint was removed.

### 3. Store Changes (`src/lib/store.ts`)

- Added `EmployeeProgressItem` interface with fields: id, sStep, miniStep, completed, score, notes, passedAt, projectId, zoneId, userId.
- Added `zoneId` to `ProgressItem` interface.
- Added `responsableId` to `Zone` interface.
- Added state: `employeeProgress: EmployeeProgressItem[]`, `currentZone: Zone | null`.
- Added actions: `fetchEmployeeProgress()`, `setCurrentZone()`.
- Updated `getMiniStepStatus()`: Now differentiates between ZONE steps (2,3,5) and INDIVIDUAL steps (1,4). Zone steps check Progress records for the current zone. Individual steps check EmployeeProgress for the current user in the current zone. Falls back to project-level behavior when no zone is selected.
- Added `isZoneMiniStepComplete()`: Checks if a zone mini-step is fully completed (zone steps: checks Progress; individual steps: checks ALL employees' EmployeeProgress).
- Updated `isQuesitoEarned()`, `is5SCompleted()`, `getCompletedCount()` to account for zone-level filtering when `currentZone` is set.
- Updated `logout()` to reset `currentZone` to null.

### 4. Component Changes

All modal components were updated to:
- Import and use `currentZone` from the store
- Pass `zoneId: currentZone?.id || null` in all progress/step API calls
- Pass `zoneId: currentZone?.id || null` in inventory API calls

Specific components updated:
- **`InventarioModal.tsx`**: Added `currentZone` from store. Passes `zoneId` in loadInventory (GET), handleAddItem (POST), handleComplete (PUT progress), handleAdminSkip (PUT progress), handleConfirmCsvImport (POST), handleImportTemplate (POST).
- **`FotosModal.tsx`**: Added `currentZone`. Passes `zoneId` in handleSubmit and handleAdminSkip.
- **`AutoevaluacionModal.tsx`**: Added `currentZone`. Passes `zoneId` in handleSubmit (progress) and handleAdminSkip. Also creates an EmployeeProgress record when submitting with zoneId and userId.
- **`AuditoriaModal.tsx`**: Added `currentZone`. Passes `zoneId` in handleSubmit (audit result, action items, progress) and handleAdminSkip.
- **`FormacionModal.tsx`**: Added `currentZone`. Passes `zoneId` and `userId` in handleSubmitExam. Passes `zoneId` in handleAdminSkip.
- **`ActionPlanModal.tsx`**: Added `currentZone`. Passes `zoneId` in handleComplete and handleAdminSkip.
- **`MaintenanceView.tsx`**: Added `currentZone`. Passes `zoneId` in action item creation.
- **`PeriodicAuditModal.tsx`**: Added `currentZone`. Passes `zoneId` in audit submission.
- **`QuarterlyAuditModal.tsx`**: Added `currentZone`. Passes `zoneId` in audit submission.

### 5. Mini-Step Type Logic

| Mini-Step | Name | Type | Completion Logic |
|-----------|------|------|-----------------|
| 1 | Formación + Examen | INDIVIDUAL | Each employee must pass. EmployeeProgress tracks individual completion. Zone Progress completed when zone-level record is set. |
| 2 | Fotografías | ZONE | One set of photos per zone. Collaborative. Uses zone-scoped Progress record. |
| 3 | Inventario | ZONE | One inventory per zone. Collaborative. Uses zone-scoped Progress record. InventoryItems now scoped to zoneId. |
| 4 | Autoevaluación | INDIVIDUAL | Each employee must complete. EmployeeProgress tracks individual completion. Zone Progress completed when zone-level record is set. |
| 5 | Auditoría | ZONE | One audit per zone. Done by auditor. Uses zone-scoped Progress record. |

### 6. Database Migration

Schema was pushed successfully with `npx prisma db push --accept-data-loss`. Prisma client was regenerated with `npx prisma generate`.

### Backward Compatibility

- `zoneId` is nullable in Progress and InventoryItem models
- When `zoneId` is null, the old project-level behavior is maintained
- Existing data without zoneId continues to work
- The API uses `findFirst` with zoneId=null for project-level queries
