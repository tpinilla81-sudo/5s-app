---
Task ID: 1
Agent: Main Agent
Task: Preparar app 5S para despliegue en Vercel + Supabase

Work Log:
- Revisé todo el código fuente: schema, APIs, componentes, store
- Cambié Prisma schema de SQLite a PostgreSQL con directUrl para Supabase
- Agregué índices @@index([projectId]) en todas las tablas con projectId
- Simplificé db.ts para serverless PostgreSQL (sin schema version hack)
- Creé src/lib/supabase-storage.ts para subida de fotos a Supabase Storage
- Actualicé src/app/api/upload/route.ts con soporte Supabase + fallback local
- Actualicé next.config.ts: eliminé output: "standalone", agregué remotePatterns para Supabase
- Corregí API de progress: cambié de rutas dinámicas anidadas a query params (/api/progress/step?sStep=X&miniStep=Y)
- Actualicé todas las APIs (progress, inventory, exam, audit, seed) para usar projectId correctamente
- Actualicé todos los componentes 5S (Formacion, Fotos, Inventario, Autoevaluacion, Auditoria) para pasar projectId
- Actualicé store.ts: fetchProgress ahora pasa projectId como query param
- Creé .env.example con documentación de todas las variables necesarias
- Build compila exitosamente con npx next build
- Generé guía de despliegue PDF en /download/guia-despliegue-5s.pdf (12 páginas)

Stage Summary:
- App lista para Vercel + Supabase
- Todos los cambios son compatibles hacia atrás (funciona en Z y en Vercel)
- Próximos pasos del usuario: crear cuentas en GitHub/Supabase/Vercel y seguir la guía
