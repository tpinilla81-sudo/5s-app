#!/bin/bash
# Startup script for production deployment
# Ensures required directories exist before starting the server

echo "🚀 Starting 5S Metodología app..."

# Create required directories
mkdir -p db
mkdir -p public/uploads/photos

# If no database exists, Prisma will create it on first push
if [ ! -f "db/custom.db" ]; then
  echo "📦 No database found. Creating..."
  npx prisma db push
fi

# Copy static files to standalone output if needed
if [ -d ".next/standalone" ]; then
  cp -r .next/static .next/standalone/.next/ 2>/dev/null
  cp -r public .next/standalone/ 2>/dev/null
  mkdir -p .next/standalone/public/uploads/photos
  mkdir -p .next/standalone/db
  # Copy database to standalone if it exists
  if [ -f "db/custom.db" ]; then
    cp db/custom.db .next/standalone/db/ 2>/dev/null
  fi
  echo "✅ Standalone files prepared"
fi

echo "🎯 Starting server..."
exec npm run start
