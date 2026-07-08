# 5S Audit Management System

## Despliegue en GitHub + Vercel + Neon

### Paso 1: Crear repositorio en GitHub
1. Ir a https://github.com/new
2. Crear repositorio (ej: `5s-app`)
3. NO inicializar con README

### Paso 2: Subir el código
```bash
# Descomprimir el ZIP
unzip 5s-app-vercel.zip
cd 5s-app

# Inicializar git
git init
git add .
git commit -m "Initial commit - 5S App"

# Conectar a GitHub (cambia TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/5s-app.git
git branch -M main
git push -u origin main
```

### Paso 3: Crear base de datos en Neon
1. Ir a https://neon.tech → Sign up / Log in
2. Create Project → nombre: `5s-app`
3. Copiar la **connection string** (empieza por `postgresql://`)
4. Tiene esta forma: `postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require`

### Paso 4: Desplegar en Vercel
1. Ir a https://vercel.com → Sign up with GitHub
2. **Add New Project** → Importar el repo `5s-app`
3. Framework Preset: **Next.js**
4. Environment Variables:
   - `DATABASE_URL` = tu connection string de Neon
5. Click **Deploy**

### Paso 5: Inicializar la base de datos
Después del primer deploy, la BD estará vacía. Para crear las tablas y datos iniciales:

1. Ir a Vercel Dashboard → tu proyecto → **Settings** → **Environment Variables**
2. Verificar que `DATABASE_URL` está configurada
3. Ir a **Deployments** → último deploy → **...** → **Redeploy**
4. La app ejecuta el seed automáticamente en el primer acceso

### Credenciales por defecto
- **Email**: `admin@5s.com`
- **Contraseña**: `admin123`

### Notas importantes
- El schema usa **PostgreSQL** (no SQLite) para funcionar en Vercel serverless
- Si necesitas cambiar el schema, edita `prisma/schema.prisma` y ejecuta `npx prisma db push`
- Las fotos se guardan en `public/uploads/` — en Vercel esto es efímero. Para producción, considerar usar un servicio externo (Supabase Storage, Cloudinary, etc.)
