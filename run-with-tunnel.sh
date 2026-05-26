#!/bin/bash
# Start server
NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 node server.js &
SERVER_PID=$!

sleep 4

# Start tunnel
/home/z/my-project/cloudflared tunnel --url http://127.0.0.1:3000 --retries 5 &
TUNNEL_PID=$!

echo "Server PID: $SERVER_PID"
echo "Tunnel PID: $TUNNEL_PID"

# Keep running
wait
