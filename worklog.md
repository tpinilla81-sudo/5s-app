---
Task ID: 1
Agent: Main
Task: Redesign 5S app to single-screen layout

Work Log:
- Diagnosed server crash: standalone server works but gets killed by container environment (K8s cgroup) after ~15-20s
- Server DOES serve requests correctly (200 OK, 8454 bytes HTML) before being killed
- Updated daemon.js and run-prod.sh to use standalone server with auto-restart
- Redesigned page.tsx from multi-page navigation to single-screen dashboard layout:
  - Left panel (320px): Compact 5S pie chart board + quesito indicators
  - Right panel (full width): All 5 S steps with their 5 mini-steps in horizontal rows
  - No more board→detail navigation: everything visible at once
  - Clicking any mini-step opens its modal directly
  - Compact header with all action buttons
- Updated store.ts: selectSStep no longer changes currentView to 'detail'
- Added handleOpenModal with sStep parameter to ensure modals know which S they belong to
- Updated Board5S.tsx with mx-auto for centering in compact panel
- Build passes successfully

Stage Summary:
- Single-screen layout implemented: board on left, all S steps with mini-steps on right
- No page navigation needed - everything visible at once
- Modals open directly when clicking mini-step buttons
- Server infrastructure issue (container kills processes) documented but not fixable in code
- Pending tasks: fix responsable audit block, audit visibility for empleados, audit report, S1Exam/S1Inventory fixes
