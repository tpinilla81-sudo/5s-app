---
Task ID: 2
Agent: Main Agent
Task: Crear matriz editable de permisos en la aplicación

Work Log:
- Añadido modelo `RolePermissionConfig` a Prisma schema con campos role, permission, allowed y unique constraint
- Ejecutado `prisma db push` para sincronizar la base de datos
- Creada API `/api/permissions/route.ts` con:
  - GET: Obtener todos los permisos (auto-seed con defaults si no existen)
  - PUT: Actualizar permisos (upsert por rol+permiso)
  - POST: Restaurar permisos a valores por defecto
- Creado hook `usePermissions` en `/src/hooks/usePermissions.ts`
- Reescrito `RolePermissions.tsx` con:
  - Vista "Consultar": tarjetas por rol + tabla comparativa + detalle por categoría
  - Vista "Editar Permisos": matriz interactiva con switches para activar/desactivar cada permiso por rol
  - Botones "Activar todo"/"Desactivar" por rol
  - Botón "Activar todo en fila" por categoría
  - Guardar cambios en base de datos
  - Restaurar defaults
  - Permisos bloqueados (no desactivables para admin)
  - Solo administradores pueden editar
- Build exitoso sin errores

Stage Summary:
- Nuevo modelo: `RolePermissionConfig` en Prisma (role + permission + allowed)
- Nueva API: `/api/permissions` (GET/PUT/POST)
- Nuevo hook: `usePermissions` (hasPermission, canEditPermissions)
- Componente `RolePermissions` completamente reescrito con matriz editable
- Permisos se persisten en base de datos SQLite
