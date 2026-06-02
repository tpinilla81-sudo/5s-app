#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

while true; do
  echo "[$(date)] Starting 5S server..."
  node server.js 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..."
  sleep 3
done
