#!/bin/bash
cd /home/z/my-project/.next/standalone
export DATABASE_URL="file:./db/custom.db"
export PORT=3000
export HOSTNAME=0.0.0.0

while true; do
  echo "[$(date)] Starting 5S server..."
  node server.js
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..."
  sleep 3
done
