---
Task ID: 1
Agent: Main Agent
Task: Rediseñar la app 5S como pantalla única con pestañas, eliminando la navegación entre vistas separadas

Work Log:
- Analizado el proyecto completo: page.tsx, Board5S, AdminPanel, GerentePanel, MaintenanceView, store.ts, 5s-constants.ts
- Identificado el problema: AdminPanel, GerentePanel y MaintenanceView eran vistas completas que reemplazaban la pantalla (currentView)
- Modificado store.ts: añadido `activeTab` state y `setActiveTab` action
- Rediseñado page.tsx: layout de pantalla única con barra de pestañas integrada en el header
- Adaptado AdminPanel: prop `embedded` para ocultar header/botón volver cuando está dentro de pestaña
- Adaptado GerentePanel: prop `embedded` para ocultar header/botón volver cuando está dentro de pestaña
- Adaptado MaintenanceView: prop `embedded` para ocultar header/botón volver cuando está dentro de pestaña
- Las pestañas disponibles se muestran según el rol del usuario (Admin, Gerencia, Mejora Continua)
- Build exitoso sin errores

Stage Summary:
- La app ahora es 100% pantalla única: todo accesible desde pestañas sin cambiar de vista
- Pestañas: "Tablero 5S" (siempre), "Gerencia" (si gerente/admin), "Admin" (si admin), "Mejora Continua" (si 5S completado)
- Los componentes mantienen compatibilidad standalone (sin `embedded`) por si se usan fuera del tab
- El header principal es compacto con selector de zona, acciones rápidas y menú de usuario
