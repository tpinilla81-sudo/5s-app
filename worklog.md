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

---
Task ID: 5
Agent: main
Task: Fix LayoutEditor drawing save, add layout requirement for S2/S3/S4, add Inventarios/Estándares template tabs, update StandardsLibrary categories

Work Log:
- TASK 1A: Added layout requirement check to InventarioModal handleComplete for S2/S3/S4
  - Added `needsLayout` flag: true when sStep is 2, 3, or 4
  - Updated `canComplete` to require `layoutUploaded` when `needsLayout` is true
  - Added guard in `handleComplete` with toast error: "Debes dibujar o subir un layout antes de completar este paso"
- TASK 1B: Verified sStep prop already passed to LayoutEditor from InventarioModal (was already correct)
- TASK 2: Added "Inventarios" tab to TemplateManager with InventoryConfigEditor
  - New tab with type `inventario` (stores inventory categories and extraFields per S step)
  - Created InventoryConfigEditor visual editor: edit category names/colors, add/edit/remove extra fields with select/text/number types and options for select type
  - Added `getDefaultInventoryContent(sStep)` that generates content from INVENTORY_CONFIGS
  - Updated template type handling throughout TemplateManager (badges, labels, select options)
- TASK 2D: InventarioModal now fetches custom inventario template
  - Added `loadCustomInventoryConfig()` that fetches from `/api/templates?type=inventario&sStep=${sStep}`
  - If custom template found, uses its categories/extraFields instead of hardcoded INVENTORY_CONFIGS
  - Falls back to default config if no custom template exists
- TASK 3: Updated StandardsLibrary categories to include all S4 standard types
  - Added: checklist, señalización, diagrama, registro, otro categories
  - These match the categories used in the inventory configs for S4
- TASK 4: Added "Estándares" tab to TemplateManager with StandardTemplateEditor
  - New tab with type `estandar` (stores standard format field definitions)
  - Created StandardTemplateEditor visual editor: add/edit/remove fields with key/label/type/required, photo type support, select options
  - Added `getDefaultStandardContent()` with default fields (beforePhotoUrl, afterPhotoUrl, responsable, contacto, mejoraTipo)
  - Updated template type handling for estandar type

Stage Summary:
- S2/S3/S4 inventory completion now requires a layout to be uploaded
- Admin can customize inventory categories and extra fields per S step via "Inventarios" tab
- Admin can define standard format field templates via "Estándares" tab
- InventarioModal dynamically uses custom inventory config when available
- StandardsLibrary has complete category list matching S4 inventory types
- All lint checks pass (no new errors in modified files)

---
Task ID: 2
Agent: Main + Full-stack subagent
Task: Fix LayoutEditor save/upload + inventory template customization + standard format template

Work Log:
- Added layout requirement check for S2/S3/S4 in InventarioModal: canComplete now requires layoutUploaded
- handleComplete shows error toast "Debes dibujar o subir un layout antes de completar este paso" if no layout for S2/S3/S4
- Added "Inventarios" tab to TemplateManager with InventoryConfigEditor visual editor
- InventoryConfigEditor allows editing categories (name, value, color) and extra fields (key, label, type, options)
- InventarioModal now fetches custom inventario template from /api/templates and uses it instead of hardcoded INVENTORY_CONFIGS
- Added "Estándares" tab to TemplateManager with StandardTemplateEditor for standard format fields
- StandardTemplateEditor allows defining fields: beforePhotoUrl, afterPhotoUrl, responsable, contacto, mejoraTipo (Seguridad/Calidad/Proceso/Logística)
- StandardsLibrary already had form support for before/after photos, responsable, contacto, mejoraTipo
- Build passes successfully

Stage Summary:
- Layout is now required before completing step 3 for S2/S3/S4
- Admin can customize inventory fields per S step via Templates panel
- Standard format includes: Before/After photos, Who did it + contact, Improvement type (Safety/Quality/Process/Logistics)
- Two new template types: "inventario" and "estandar" added to admin panel

---
Task ID: session-fixes-2026-05-30
Agent: Main Agent
Task: Fix permissions reset, layout save, step validation, photo traceability, admin reorder

Work Log:
- Fixed permissions auto-reseed bug: Changed from deleteMany+recreate to upsert-only for missing permissions, preserving custom edits. Added stale permission cleanup.
- Fixed seed route: Removed old-format permission seeding (complete_steps, manage_users) that triggered the auto-reseed.
- Fixed layout upload/save: Added filename sanitization (no spaces), better error handling, moved LayoutEditor outside nested Dialog, added logging.
- Fixed standards API: Added project/zone existence verification, better error messages with Prisma error codes.
- Added step validation: Server-side prerequisite validation in PUT /api/progress/step - validates previous steps completed, layout uploaded for S2/S3/S4 step 3.
- Added photo traceability: FotosModal now saves photos to PhotoLibrary with title, type (ANTES/DESPUÉS/REFERENCIA/HALLAZGO), zone, S step, who uploaded, tags, and description.
- Connected template system: StandardsLibrary now loads estandar template fields, validates required fields, shows asterisks on required labels.
- Created estandar templates in DB for all 5 S steps.
- Reordered admin tabs: Empresas → Usuarios → Proyectos → Plantillas.
- Reordered template sub-tabs: Formaciones y Exámenes → Inventarios → Estándares → Auditorías.

Stage Summary:
- Permissions no longer reset when loading (critical fix)
- Layout drawing upload and save now works with sanitized filenames
- Step 3 (Layout) is required before completing for S2/S3/S4
- Photos from step 2 are now saved to Photo Library with full traceability
- Admin panel order: Empresas/Usuarios/Proyectos/Plantillas
- Template sub-tabs: Formaciones y Exámenes/Inventarios/Estándares/Auditorías
