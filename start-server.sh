#!/bin/bash
cd /home/z/my-project
# Kill any existing
pkill -f "next start" 2>/dev/null
sleep 1
node /home/z/my-project/node_modules/next/dist/bin/next start -p 3000
