---
Task ID: 1
Agent: main
Task: Fix S1 Audit - Server-side role check

Work Log:
- Added session user verification to /api/audit/route.ts POST handler
- Only admin and auditor roles can now submit audits (server-side enforcement)
- Returns 403 with clear error message for unauthorized roles
- Also added 401 response for unauthenticated requests

Stage Summary:
- Server-side audit role check implemented
- Prevents responsable/empleado from submitting audits via API
---
Task ID: 2
Agent: main
Task: Enhance SStepDetail audit history with full ActionItem details

Work Log:
- Added RelatedAction interface with full fields
- Added loadRelatedActions() function to fetch audit-related action items
- Enhanced audit history display to show: concepto, plan de acción, responsable, fecha compromiso, fecha real cierre
- Added acciones preventivas display
- Added badge for open disfunciones count
- Show related actions even when no specific audit match

Stage Summary:
- Audit history now shows full disfuncion details with all requested fields
- Action items are matched to specific audits via itemId in hallazgo
---
Task ID: 3
Agent: main
Task: Create AuditResultsModal accessible from header for all roles

Work Log:
- Created new AuditResultsModal.tsx component
- Three tabs: Resumen (scores + stats), Disfunciones (filterable), Seguimiento (per-S progress)
- Shows per-S-step audit scores, per-zone breakdown
- Full disfuncion details: concepto, plan de acción, responsable, fecha compromiso, fecha real cierre
- Filters by S-step, zone, estado
- Added 'auditResults' modal type to store
- Added "Auditoría" button in header visible to all roles
- Added AuditResultsModal rendering in page.tsx

Stage Summary:
- New AuditResultsModal accessible from header for gerente/responsable/empleado
- Shows all audit data including scores and disfunciones with full tracking
---
Task ID: 4
Agent: main
Task: Enhance Global ActionPlanModal

Work Log:
- Updated loadActions to not filter by sStep when miniStep=0 (global mode)
- Updated title to show "Plan de Acción — Global" when opened globally
- Shows all actions across all S-steps when opened via header button

Stage Summary:
- Global ActionPlanModal now shows ALL actions, not just one S-step
---
Task ID: 5
Agent: main
Task: Build and test

Work Log:
- Next.js build successful with no errors
- PM2 restart successful
- App running on localhost:3000

Stage Summary:
- All changes compiled and deployed successfully
