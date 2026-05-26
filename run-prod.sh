#!/bin/bash
# Robust production server script for 5S app
cd /home/z/my-project/.next/standalone
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

echo "[$(date)] Starting 5S server on 0.0.0.0:3000..."

while true; do
  node server.js 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..."
  sleep 3
done
