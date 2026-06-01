#!/bin/bash
# ============================================================
# Script para reconstruir y reiniciar la aplicación 5S
# Uso: bash /home/z/my-project/rebuild.sh
# ============================================================

set -e
cd /home/z/my-project

echo "🔧 Deteniendo servidor..."
pm2 stop 5s-app 2>/dev/null || true

echo "🧹 Limpiando caché..."
rm -rf .next

echo "🔨 Reconstruyendo aplicación..."
npx next build

echo "🚀 Reiniciando servidor con PM2..."
pm2 restart 5s-app 2>/dev/null || pm2 start ecosystem.config.js

echo "⏳ Esperando a que el servidor esté listo..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Servidor listo en http://localhost:3000"
    pm2 status
    exit 0
  fi
  sleep 2
done

echo "⚠️ El servidor tardó más de lo esperado. Verifica con: pm2 status"
pm2 status
