---
Task ID: 1
Agent: Main Agent
Task: Fix step 3 S2 layout save and photo upload, fix audit completion flow

Work Log:
- Discovered root cause: `/api/upload` route was MISSING - all file uploads (FotosModal, LayoutEditor, InventarioModal) were failing because this API didn't exist
- Created `/api/upload/route.ts` with Supabase Storage support and local filesystem fallback
- Fixed LayoutEditor: removed requirement for `saveName` (auto-generates name), added `sStep` prop, uploads image to storage instead of storing huge base64 in DB, uses toast instead of alert
- Fixed InventarioModal: extended layout support to S3 and S4 (not just S2), passes `sStep` prop to LayoutEditor, improved `handleUploadLayoutImage` with proper sStep, better error handling, and response checking
- Fixed `fetchProgress` in store.ts to also refresh `employeeProgress` - this was causing `isQuesitoEarned` to use stale data after audit completion
- Fixed AuditoriaModal: added proper error handling for progress update failures (403 permission errors were silently failing), always marks UI as completed when audit is saved, shows clear error messages

Stage Summary:
- Created: `/home/z/my-project/src/app/api/upload/route.ts` - new upload API route
- Modified: `/home/z/my-project/src/components/5s/LayoutEditor.tsx` - auto-generate names, upload to storage, sStep prop, toast notifications
- Modified: `/home/z/my-project/src/components/5s/InventarioModal.tsx` - layout for S2/S3/S4, proper sStep handling, better upload error handling
- Modified: `/home/z/my-project/src/lib/store.ts` - fetchProgress now also refreshes employeeProgress
- Modified: `/home/z/my-project/src/components/5s/AuditoriaModal.tsx` - better error handling for progress update failures
