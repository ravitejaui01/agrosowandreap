#!/bin/bash
# Setup PostgreSQL and apply schema so data saves to the database

set -e
cd "$(dirname "$0")/.."

echo "1. Starting PostgreSQL (Docker)..."
docker-compose up -d

echo "2. Waiting for PostgreSQL to be ready..."
sleep 3

echo "3. Creating api/.env if needed..."
if [ ! -f api/.env ]; then
  cp api/.env.example api/.env
  echo "   Created api/.env from .env.example"
else
  echo "   api/.env already exists"
fi

echo "4. Applying database schema..."
(cd api && npm run db:init)

echo ""
echo "Done! Data will now save to the database."
echo "Run: npm run dev"
echo ""
