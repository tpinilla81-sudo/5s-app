#!/bin/bash
while true; do
  echo "[$(date)] Starting server..."
  cd /home/z/my-project
  NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 node -e "
    process.on('SIGTERM', () => { console.log('SIGTERM received'); process.exit(0); });
    process.on('SIGINT', () => { console.log('SIGINT received'); process.exit(0); });
    process.on('uncaughtException', (err) => { console.error('Uncaught:', err); });
    process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); });
    require('./server.js');
  " 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
