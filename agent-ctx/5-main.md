# Task 5 - Fix LayoutEditor, Add Inventarios/Estándares Tabs

## Work Completed

### TASK 1: Fix LayoutEditor
- Added layout requirement to InventarioModal `canComplete` for S2/S3/S4
- `needsLayout` flag = true when sStep is 2, 3, or 4
- `canComplete` now requires `layoutUploaded` when `needsLayout` is true
- handleComplete has extra guard with toast error message
- sStep prop was already being passed to LayoutEditor from InventarioModal (verified)

### TASK 2: Inventarios Template Tab
- Added `inventario` type and "Inventarios" tab to TemplateManager
- Created InventoryConfigEditor with category and extra field editing
- Added getDefaultInventoryContent() default generator
- InventarioModal fetches custom inventario template and uses it instead of hardcoded config

### TASK 3: StandardsLibrary Updates
- Added checklist, señalización, diagrama, registro, otro categories to CATEGORIES

### TASK 4: Estándares Template Tab
- Added `estandar` type and "Estándares" tab to TemplateManager
- Created StandardTemplateEditor with field definition editing
- Added getDefaultStandardContent() with beforePhotoUrl, afterPhotoUrl, responsable, contacto, mejoraTipo

## Files Modified
- /home/z/my-project/src/components/5s/InventarioModal.tsx
- /home/z/my-project/src/components/admin/TemplateManager.tsx
- /home/z/my-project/src/components/5s/StandardsLibrary.tsx
- /home/z/my-project/worklog.md
