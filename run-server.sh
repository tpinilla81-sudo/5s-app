#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export HOSTNAME=0.0.0.0
export PORT=3000

# Detach from terminal completely
exec npx next start -p 3000
