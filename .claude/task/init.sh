#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Automisa Mobile — Dev Environment Init
# ═══════════════════════════════════════════════════════════════
# Repo: MiguelonDevXiri/AppInvalMovil (branch: develop)
# Port registry: ~/projects/PORTS.md
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_PATH="$HOME/projects/iot-platform/automisa-mobile"
BACKEND_PATH="$HOME/projects/iot-platform/automisa-backend"
cd "$PROJECT_PATH"

echo "═══════════════════════════════════════════════════════════════"
echo "  Automisa Mobile — Environment Init"
echo "  Path: $PROJECT_PATH"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "  Last commit: $(git log --oneline -1 2>/dev/null || echo 'none')"
echo "═══════════════════════════════════════════════════════════════"

FAILED=0

# ─────────────────────────────────────────────────────────────────
# 0. BRANCH CHECK (CRITICAL)
# ─────────────────────────────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    echo ""
    echo "⛔ On '$BRANCH' branch! Switching to develop..."
    git checkout develop 2>/dev/null || git checkout -b develop
    BRANCH=$(git branch --show-current)
fi
echo ""
echo "🌿 Branch: $BRANCH ✅"

# ─────────────────────────────────────────────────────────────────
# 1. Node dependencies
# ─────────────────────────────────────────────────────────────────
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   📥 Installing dependencies..."
    npm install 2>&1 | tail -3
fi

if [ -d "node_modules" ]; then
    echo "   ✅ node_modules present"
else
    echo "   ❌ npm install failed"
    ((FAILED++))
fi

# ─────────────────────────────────────────────────────────────────
# 2. Backend infrastructure (for API features)
# ─────────────────────────────────────────────────────────────────
echo ""
echo "🐳 Checking backend infrastructure..."

PG_RUNNING=$(sg docker -c "docker ps --filter name=automisa-postgres-dev --filter status=running -q" 2>/dev/null)
REDIS_RUNNING=$(sg docker -c "docker ps --filter name=automisa-redis-dev --filter status=running -q" 2>/dev/null)

if [ -n "$PG_RUNNING" ] && [ -n "$REDIS_RUNNING" ]; then
    echo "   ✅ Postgres + Redis running"
else
    echo "   🚀 Starting backend infra..."
    cd "$BACKEND_PATH"
    sg docker -c "docker compose -f docker-compose.dev.yml up -d postgres redis" 2>&1 | tail -3
    cd "$PROJECT_PATH"
    sleep 5
    echo "   ✅ Infrastructure starting"
fi

# ─────────────────────────────────────────────────────────────────
# 3. Backend API
# ─────────────────────────────────────────────────────────────────
echo ""
echo "🔌 Checking backend API..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "   ✅ API running on :8001"
else
    echo "   🚀 Starting API..."
    cd "$BACKEND_PATH"
    nohup env DATABASE_URL="postgresql+asyncpg://iot:iot_secret@localhost:5433/iot_platform" \
          REDIS_URL="redis://localhost:6380" \
          poetry run uvicorn api.main:app --port 8001 --reload > /tmp/automisa-api.log 2>&1 &
    cd "$PROJECT_PATH"
    sleep 3
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo "   ✅ API started"
    else
        echo "   ⚠️  API may still be starting. Check: tail -f /tmp/automisa-api.log"
    fi
fi

# ─────────────────────────────────────────────────────────────────
# 4. TypeScript check
# ─────────────────────────────────────────────────────────────────
if [ -f "tsconfig.json" ]; then
    echo ""
    echo "🔍 TypeScript check..."
    cd "$PROJECT_PATH"
    if npx tsc --noEmit 2>/dev/null; then
        echo "   ✅ No type errors"
    else
        echo "   ⚠️  TypeScript errors (non-blocking)"
    fi
fi

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
    echo "  ✅ Environment Ready"
else
    echo "  ⚠️  $FAILED checks failed"
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Branch:  $BRANCH (⚠️ never commit to master)"
echo "API:     http://localhost:8001"
echo "Expo:    npx expo start (run manually)"
echo "Web:     npx expo start --web (for Puppeteer testing)"
echo ""

exit $FAILED
