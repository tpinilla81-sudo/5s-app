#!/bin/bash
# ============================================
# 5S Methodology App - VPS Deployment Script
# ============================================
# This script deploys the app on a fresh Ubuntu VPS
# 
# Requirements: Ubuntu 20.04+ with root access
# Usage: bash deploy-vps.sh
# ============================================

set -e

echo "========================================="
echo "  5S App - Despliegue en VPS"
echo "========================================="

# Configuration
APP_DIR="/opt/5s-app"
APP_PORT=3000
DOMAIN=""  # Set your domain here, e.g.: midominio.com

# Install Node.js
echo ""
echo "[1/6] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
echo ""
echo "[2/6] Instalando PM2..."
npm install -g pm2

# Install Caddy (reverse proxy with auto-HTTPS)
echo ""
echo "[3/6] Instalando Caddy..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Create app directory
echo ""
echo "[4/6] Creando directorio de la app..."
mkdir -p $APP_DIR
cd $APP_DIR

# Copy app files (assuming they're already in this directory)
echo ""
echo "[5/6] Instalando dependencias y construyendo..."
npm install
npx prisma generate
npm run build

# Start with PM2
echo ""
echo "[6/6] Iniciando la aplicación..."
PORT=$APP_PORT HOSTNAME=0.0.0.0 pm2 start .next/standalone/server.js --name 5s-app
pm2 save
pm2 startup

# Configure Caddy
echo ""
echo "Configurando Caddy..."
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy localhost:$APP_PORT
}
EOF
  echo "✓ Caddy configurado con dominio: $DOMAIN"
  echo "  Se generará certificado SSL automáticamente"
else
  cat > /etc/caddy/Caddyfile <<EOF
:80 {
    reverse_proxy localhost:$APP_PORT
}
EOF
  echo "✓ Caddy configurado sin dominio (HTTP en puerto 80)"
fi

systemctl restart caddy

echo ""
echo "========================================="
echo "  ✓ Despliegue completado!"
echo "========================================="
echo ""
if [ -n "$DOMAIN" ]; then
  echo "  URL: https://$DOMAIN"
else
  echo "  URL: http://TU_IP_PUBLICA"
fi
echo ""
echo "  Comandos útiles:"
echo "    pm2 status         → Ver estado de la app"
echo "    pm2 logs 5s-app    → Ver logs"
echo "    pm2 restart 5s-app → Reiniciar"
echo ""
