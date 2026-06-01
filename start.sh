#!/bin/bash
cd /home/z/my-project
export HOSTNAME=0.0.0.0
export PORT=3000
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
exec npx next dev -p 3000
