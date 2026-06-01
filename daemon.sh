#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export PORT=3000
export HOSTNAME=0.0.0.0

# Double fork to fully detach from controlling terminal
(setsid npx next start -p 3000 > /tmp/nextdaemon.log 2>&1 &)
