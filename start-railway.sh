#!/bin/bash
# Railway startup script for 5S App
# This script initializes the database and starts the Next.js server

set -e

echo "=== 5S App - Railway Startup ==="

# Determine DB path
if [ -n "$RAILWAY_VOLUME_MOUNT_PATH" ]; then
  DB_DIR="$RAILWAY_VOLUME_MOUNT_PATH"
  DB_PATH="$RAILWAY_VOLUME_MOUNT_PATH/custom.db"
else
  DB_DIR="./db"
  DB_PATH="./db/custom.db"
fi

echo "Database path: $DB_PATH"

# Set DATABASE_URL for Prisma
export DATABASE_URL="file:$DB_PATH"

# Create DB directory if it doesn't exist
mkdir -p "$DB_DIR"

# Initialize database with Prisma schema if DB doesn't exist
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found. Creating new database..."
  npx prisma db push --skip-generate 2>&1 || {
    echo "Warning: prisma db push failed, trying with prisma generate first..."
    npx prisma generate 2>&1
    npx prisma db push --skip-generate 2>&1
  }
  echo "Database created successfully."
else
  echo "Database found. Running prisma db push to ensure schema is up to date..."
  npx prisma db push --skip-generate 2>&1 || true
fi

# Seed the database (call the seed API after server starts)
echo "Starting server..."
export HOSTNAME="0.0.0.0"
export PORT=${PORT:-3000}

# Start server in background
node .next/standalone/server.js &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
    echo "Server is ready!"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 2
done

# Seed the database if empty
echo "Seeding database..."
SEED_RESPONSE=$(curl -s -X POST "http://localhost:$PORT/api/seed" 2>&1 || echo "SEED_FAILED")
if echo "$SEED_RESPONSE" | grep -q "success"; then
  echo "Database seeded successfully!"
else
  echo "Seed response: $SEED_RESPONSE"
  echo "Database may already have data."
fi

echo "=== 5S App is running on port $PORT ==="

# Wait for server process
wait $SERVER_PID
