#!/bin/bash
# Create a new task for the Automisa Mobile coding agent
# Repo: MiguelonDevXiri/AppInvalMovil (branch: develop)
#
# Usage: ./create-task.sh <task-id> "<goal>"

set -e

TASK_ID="${1:?Usage: $0 <task-id> '<goal>'}"
GOAL="${2:?Usage: $0 <task-id> '<goal>'}"

TASK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$TASK_DIR/../.." && pwd)"
ARCHIVE_DIR="$TASK_DIR/archive"

# Branch safety
cd "$PROJECT_DIR"
BRANCH=$(git branch --show-current 2>/dev/null)
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    echo "⛔ On $BRANCH! Switching to develop..."
    git checkout develop 2>/dev/null || git checkout -b develop
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  Automisa Mobile — New Task"
echo "  Task:    $TASK_ID"
echo "  Goal:    $GOAL"
echo "  Branch:  $(git branch --show-current)"
echo "  Repo:    MiguelonDevXiri/AppInvalMovil"
echo "═══════════════════════════════════════════════════════════════"

# Archive existing task
EXISTING_TASK=$(jq -r '.task_id // empty' "$TASK_DIR/features.json" 2>/dev/null || true)
if [ -n "$EXISTING_TASK" ] && [ "$EXISTING_TASK" != "null" ]; then
    mkdir -p "$ARCHIVE_DIR/$EXISTING_TASK"
    cp "$TASK_DIR/TASK.md" "$ARCHIVE_DIR/$EXISTING_TASK/" 2>/dev/null || true
    cp "$TASK_DIR/features.json" "$ARCHIVE_DIR/$EXISTING_TASK/" 2>/dev/null || true
    cp "$TASK_DIR/progress.txt" "$ARCHIVE_DIR/$EXISTING_TASK/" 2>/dev/null || true
    echo "📦 Archived: $EXISTING_TASK"
fi

cat > "$TASK_DIR/TASK.md" << TASK
# Task: $TASK_ID

## Goal
$GOAL

## Project
- **Repo:** MiguelonDevXiri/AppInvalMovil
- **Branch:** $(git branch --show-current) (⚠️ NEVER commit to master)
- **Path:** $PROJECT_DIR
- **Stack:** React Native + Expo SDK 54 / TypeScript / Expo Router

## Existing App Context
Miguel's maintenance inspection app — currently 100% local (AsyncStorage).
- Checklist templates: \`data/machineChecklists.ts\`
- Machine types: \`data/machineTypes.ts\`
- Storage model: \`utils/storage.ts\`
- ACTECO model: \`utils/actecoStorage.ts\`
- Screens: \`app/(tabs)/\`

## Constraints
- Work on \`develop\` branch only
- Keep existing functionality working (don't break what works)
- TypeScript strict
- Backend API: http://localhost:8001
- Domain reference: ~/clawd/reference/automisa/domain-insights-2026-02-05.md
TASK

cat > "$TASK_DIR/features.json" << FEATURES
{
  "task_id": "$TASK_ID",
  "project": "automisa-mobile",
  "created_at": "$(date -Iseconds)",
  "features": []
}
FEATURES

cat > "$TASK_DIR/progress.txt" << PROGRESS
# Progress: $TASK_ID
# Goal: $GOAL
# Branch: $(git branch --show-current)
# Created: $(date -Iseconds)

═══════════════════════════════════════════════════════════════
STATUS: Task created — awaiting INITIALIZER session
═══════════════════════════════════════════════════════════════

PROGRESS

echo ""
echo "✅ Task created! Next:"
echo "   cd $PROJECT_DIR && claude --dangerously-skip-permissions"
