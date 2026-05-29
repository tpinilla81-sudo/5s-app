---
Task ID: 1
Agent: main
Task: Create standard format (formato estándar) with before/after photos, responsible, contact, and improvement type

Work Log:
- Updated Prisma schema: added `beforePhotoUrl`, `afterPhotoUrl`, `responsable`, `contacto`, `mejoraTipo` fields to Standard model
- Pushed schema changes to database successfully
- Updated `/api/standards/route.ts` to handle new fields in POST and PUT
- Completely rewrote `StandardsLibrary.tsx` with new "Formato Estándar de Mejora" feature:
  - New category "formato_mejora" with dedicated UI
  - Before/After photo upload with preview
  - Responsable field (who made the improvement)
  - Contacto field (phone/email)
  - Improvement type selector: Seguridad/Calidad/Proceso/Logística with color-coded icons
  - Full detail view (StandardFormatCard) with photo comparison
  - Mini preview in list view with before/after thumbnails
- Added MEJORA_TIPOS constant with 4 types: seguridad (red), calidad (blue), proceso (green), logística (amber)

Stage Summary:
- Standard format with before/after photos, responsible, contact, and improvement type implemented
- Schema migration completed
- API supports all new fields
- UI fully functional with dedicated "Formato Mejora" button

---
Task ID: 2
Agent: main
Task: Fix progress calculation: 1S shows 80% when finished, 2S shows 20% when 2 steps done

Work Log:
- Identified root cause: SStepDetail.tsx had custom progress calculation that didn't match getMiniStepStatus
- The old calculation counted employees separately and divided by totalEmployees+4, causing incorrect percentages
- Replaced with getMiniStepStatus-based calculation: counts completed/completed_viewonly steps out of 5
- Now uses the same single source of truth as Board5S.tsx (the pie chart)

Stage Summary:
- Progress bar in SStepDetail now matches the pie chart dots
- Fixed: 1S completed = 100% (5/5), 2S with 2 steps = 40% (2/5)

---
Task ID: 3
Agent: main
Task: Fix layout save bug in Step 3 S2

Work Log:
- Improved handleSaveToLibrary in LayoutEditor.tsx:
  - Added error message when no project selected (was silently returning)
  - Added check for empty drawing (shapes + bgImage)
  - Added fallback when upload returns no URL
  - Added explicit null check for photoUrl before saving
  - Used toast.error() instead of alert() for all error messages
  - Added better console.warn for upload failures

Stage Summary:
- Layout save now has robust error handling
- All failure paths show user-facing messages
- Upload fallback to data URL is explicit

---
Task ID: 1
Agent: Main
Task: Fix progress percentage calculation bug (1S=80% should be 100%, 2S counts wrong)

Work Log:
- Identified that the stats API (`/api/stats`) only counted the `progress` table and ignored `employeeProgress`
- Step 1 (Formación) is an individual step tracked in `employeeProgress`, but zone-level `progress` only marks it `completed: true` when ALL employees in a zone pass the exam
- Found 3 locations with the bug:
  1. Stats API (`/api/stats/route.ts`) - Only counted `progress` table
  2. S-Step cards in page.tsx (lines 679-690) - Only counted `progress` array
  3. Board5S already used `getMiniStepStatus` which checks both ✓
- Fixed stats API: Added `employeeProgress` fetch and `isStepCompleted` helper that checks BOTH tables
- Fixed page.tsx S-Step cards: Changed to use `getMiniStepStatus` (consistent with Board5S)
- Also fixed stats API: Total is now always 25 (5S × 5 steps) instead of counting progress records

Stage Summary:
- Root cause: Step 1 (Formación) completion was not counted because it's tracked in `employeeProgress` not `progress`
- Stats API now correctly counts both zone-level and employee-level completions
- S-Step cards now use getMiniStepStatus for consistent counting
- Build passes successfully
