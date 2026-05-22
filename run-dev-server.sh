#!/bin/bash
cd /home/z/my-project
export PORT=3000

while true; do
  echo "[$(date)] Starting dev server..."
  npx next dev -p 3000 -H 0.0.0.0
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..."
  sleep 3
done
