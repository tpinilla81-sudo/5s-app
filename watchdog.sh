#!/bin/bash
while true; do
  if ! lsof -i :3000 > /dev/null 2>&1; then
    echo "[$(date)] Starting server..." >> /home/z/my-project/watchdog.log
    cd /home/z/my-project
    NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 node server.js >> /home/z/my-project/watchdog.log 2>&1 &
    sleep 5
  fi
  sleep 5
done
