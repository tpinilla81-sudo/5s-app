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

---
Task ID: 3
Agent: Main Agent
Task: Generar plantillas de inventario para S1-S4 y actualizar la app con pasos específicos por S

Work Log:
- Creadas 5 plantillas Excel profesionales con diseño por colores de cada S:
  - S1_Inventario_Innecesarios_Seiri.xlsx (púrpura) — categorías Innecesario/Dudoso/Necesario, campos Estado/Frecuencia/Decisión
  - S2_Inventario_Necesarios_Seiton.xlsx (amarillo) — categorías Muy frecuente/Frecuente/Ocasional/Raro, campos Ubicación asignada/Método identificación/Cercanía
  - S3_Inventario_Puntos_Suciedad_Seiso.xlsx (azul) — categorías Polvo/Grasa/Mancha/Residuos/Humedad/Oxidación, campos Nivel/Fuente/Método limpieza/Frecuencia
  - S4_Inventario_Estandares_Seiketsu.xlsx (rosa) — categorías Visual/Procedimiento/Checklist/Señalización/Diagrama, campos Estado/Documentado/Cumplimiento/Fecha revisión
  - S5_Inventario_Disciplina_Shitsuke.xlsx (naranja) — categorías Cumplido/Parcial/Incumplido, campos Práctica/Responsable/Frecuencia
- Todas las plantillas con: sección info proyecto, cabeceras con color S, validaciones de datos, filas vacías, totales, notas, configuración impresión landscape
- Actualizado `5s-constants.ts`:
  - MiniStep paso 2 renombrado a "Fotografías (Antes)" con descriptionsByS específicos
  - MiniStep paso 3 con descriptionsByS específicos por S
  - Nuevo interfaz `InventoryConfig` con categorías, campos extra y nombre plantilla por S
  - Constante `INVENTORY_CONFIGS` con config completa para cada S (1-5)
- Actualizado `MiniStepCard.tsx`: usa descriptionByS para mostrar descripciones específicas por S
- Reescrito `FotosModal.tsx`: enfocado en fotos ANTES con instrucciones específicas por S
- Reescrito `InventarioModal.tsx`: dinámico por S usando INVENTORY_CONFIGS:
  - Categorías específicas por S
  - Campos extra configurables (select/text/number)
  - Botón "Descargar Plantilla Excel" enlazando a /templates/
  - Exportar CSV con campos extra
- Plantillas copiadas a `/public/templates/` para descarga desde la app
- Build exitoso sin errores

Stage Summary:
- 5 plantillas Excel generadas en `/download/` y `/public/templates/`
- Paso 2 = Fotografías (Antes) con contexto S-específico
- Paso 3 = Inventario con categorías y campos dinámicos por S
- INVENTORY_CONFIGS proporciona configuración completa por cada S
- App compilada correctamente
