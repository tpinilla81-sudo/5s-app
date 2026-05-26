# Task: improvements-batch-2 - Implement 8 improvements

## Summary
All 8 tasks have been successfully implemented. The build compiles cleanly with `npx next build`.

## Changes Made

### TASK 1: Fix Bug - Responsable should NOT be able to perform auditoría
- **File**: `src/components/5s/SStepDetail.tsx`
- Added role check: if user is NOT admin/auditor, mini-step 5 (Auditoría) shows as locked with "Solo auditores" reason
- Added `lockedReason` prop to MiniStepCard

### TASK 2: Improve 1S Inventory Frecuencia de Uso options
- **File**: `src/lib/5s-constants.ts`
- Changed frecuenciaUso options from `['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Anual', 'Nunca']` to `['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Anual', 'Innecesario', 'Dudoso']`

### TASK 3: Global Jaula de Excedentes View
- **Files**: `src/components/auth/GerentePanel.tsx`, `src/app/api/inventory/route.ts`
- Added `jaulaOnly=true` query parameter to inventory API
- Added "Jaula de Excedentes" tab in GerentePanel showing ALL items across all projects
- Filterable by status (en_jaula, reclamado, transferido)
- Shows totals (item count, total value)

### TASK 4: Plan de Acción with Role-based Visibility and Zone Assignment
- **Schema**: Added `zoneId String?` and `verificadoPor String?` to ActionItem; added `actionItems` relation to Zone
- **API** (`src/app/api/actions/route.ts`): Added role-based filtering (gerente=all, responsable=own projects, empleado=own zones)
- **Modal** (`src/components/5s/ActionPlanModal.tsx`): Added Zona dropdown and Verificado por field
- **GerentePanel**: Added "Planes de Acción" tab grouped by project and zone

### TASK 5: Visual Test Completion Indicator
- **File**: `src/components/5s/MiniStepCard.tsx`
- Added `lockedReason` and `notes` props
- For exam (miniStep 1): ✅ if score >= 80%, ❌ if failed
- For audit (miniStep 5): ✅ if apto, ❌ if no_apto

### TASK 6: Save Failed Audits + Visible Disfunciones
- **File**: `src/components/5s/SStepDetail.tsx`
- Added collapsible "Historial de Auditorías" section
- Shows all past audits with result, score, auditor, date, observations, NOK disfunciones
- Color-coded: green for apto, red for no_apto

### TASK 7: Import/Export CSV for Inventory
- **File**: `src/components/5s/InventarioModal.tsx`
- Added "Importar CSV" button with hidden file input
- CSV parser that maps columns by header name (Spanish headers)
- Preview table before confirming import

### TASK 8: Alertas de Fechas Vencidas
- **Files**: `src/components/5s/SStepDetail.tsx`, `src/components/auth/GerentePanel.tsx`
- Red banner in SStepDetail when there are overdue actions
- Red overdue count badge in GerentePanel's action plan tab
- Red overdue count in the Plan de Acción indicator card

## Schema Changes
Run `npx prisma db push` and `npx prisma generate` after changes (already done).

## Lint Status
Pre-existing lint errors in daemon.js, server.js, MaintenanceView.tsx, ProgressDashboard.tsx remain.
New code in my modified files has only the `react-hooks/set-state-in-effect` pattern warnings (calling async functions that call setState from useEffect), which is the same pattern used throughout the existing codebase.
