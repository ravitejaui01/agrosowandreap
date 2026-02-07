#!/bin/bash
# Automatically setup database before dev (runs silently, no failure if Docker missing)
cd "$(dirname "$0")/.."

# 1. Start PostgreSQL if Docker is available
docker-compose up -d 2>/dev/null || true

# 2. Wait briefly for DB to be ready
sleep 2

# 3. Create api/.env if missing
if [ ! -f api/.env ]; then
  cp api/.env.example api/.env 2>/dev/null || true
fi

# 4. Apply schema (may fail if DB not running - that's ok, fallback store will work)
(cd api && npm run db:init) 2>/dev/null || true
