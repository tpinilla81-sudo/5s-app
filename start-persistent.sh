#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

# Start and write PID
npx next start -p 3000 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/next-server.pid

# Wait for server to be ready
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "Server ready with PID $SERVER_PID"
    break
  fi
  sleep 1
done

# Keep the script running to maintain the process
wait $SERVER_PID
