#!/bin/bash
while true; do
  echo "Starting tunnel..."
  /home/z/my-project/cloudflared tunnel --url http://127.0.0.1:3000 --retries 5 2>&1 | tee /home/z/my-project/tunnel-live.log &
  TUNNEL_PID=$!
  
  # Wait for URL to appear
  sleep 10
  URL=$(grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' /home/z/my-project/tunnel-live.log | head -1)
  if [ -n "$URL" ]; then
    echo "TUNNEL_URL=$URL" > /home/z/my-project/CURRENT_URL.txt
    echo "Active URL: $URL"
  fi
  
  # Wait for tunnel to die
  wait $TUNNEL_PID 2>/dev/null
  echo "Tunnel died, restarting in 3s..."
  sleep 3
done
