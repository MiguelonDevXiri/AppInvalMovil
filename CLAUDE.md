# Automisa Mobile — Claude Code Instructions

> **Platform:** Operational control platform for recycling plant machinery
> **Stack:** React Native + Expo SDK 54 / TypeScript / Expo Router
> **Repo:** MiguelonDevXiri/AppInvalMovil (branch: `develop`)
> **Origin:** Miguel's existing maintenance inspection app — we're evolving it into a cloud-connected platform
> **Backend API:** http://localhost:8001

---

## ⚠️ Branch Policy

**ALL work happens on `develop` or feature branches. NEVER commit to `master` directly.**

`master` is Miguel's original app. Our work lives on `develop`.

```bash
# Verify branch before ANY work
git branch --show-current  # Must be "develop" or "feature/*"

# Feature branches for major work
git checkout -b feature/<name> develop
```

---

## Long-Running Agent Protocol

This project uses the **Anthropic long-running agent pattern**. You work in discrete sessions — each session starts fresh with no memory. These files ARE your memory.

**There are two modes.** Check which one applies:

---

### MODE 1: INITIALIZER (First Session)

You are the initializer if `.claude/task/features.json` has zero real features (empty array, or only TODO placeholders).

**Your job is to SET UP the foundation for all future sessions:**

```bash
# 1. Orient
pwd
cat .claude/task/TASK.md

# 2. Verify branch (CRITICAL)
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    echo "⛔ On $BRANCH! Switching to develop..."
    git checkout develop
fi

# 3. Understand the EXISTING codebase
# This is Miguel's real app — understand what's already built
ls app/ components/ data/ utils/
cat package.json | jq '.dependencies'
cat data/machineTypes.ts        # Machine taxonomy
cat data/machineChecklists.ts   # Checklist templates (key data!)
cat utils/storage.ts            # Current data model
cat utils/actecoStorage.ts      # Emergency repair model

# 4. EXPAND goal into comprehensive features in .claude/task/features.json
# Order: types → api → stores → components → screens → navigation → e2e
# ALL features start with "passes": false

# 5. Checkpoint commit
git add -A
git commit -m "checkpoint: initialized task [TASK_ID] — [N] features defined"

# 6. Update progress.txt
```

---

### MODE 2: CODING AGENT (Session 2+)

You are the coding agent if `.claude/task/features.json` already has real features defined.

#### Step 1: Get Your Bearings (MANDATORY)

```bash
# 1. Where am I?
pwd

# 2. VERIFY BRANCH
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    git checkout develop
fi

# 3. What's the task?
cat .claude/task/TASK.md

# 4. What's pending?
jq '.features[] | select(.passes==false) | {id, category, description}' .claude/task/features.json

# 5. How many done vs total?
jq '{total: (.features | length), passing: ([.features[] | select(.passes==true)] | length)}' .claude/task/features.json

# 6. Previous sessions
cat .claude/task/progress.txt

# 7. Git state
git log --oneline -15
git status --short

# 8. Start environment
bash .claude/task/init.sh
```

#### Step 2: Verify Before Building

Pick 1-2 passing features and re-test. Fix before new work.

#### Step 3: Work Loop

1. Pick ONE feature with `"passes": false`
2. Implement it
3. **VERIFY** (see Testing Strategy)
4. Set `"passes": true` only after verification
5. Commit:
   ```bash
   git add -A
   git commit -m "feat: [description]

   - Verified by [how]
   - Status: [X]/[Total] features passing"
   ```
6. Update `.claude/task/progress.txt`
7. Repeat

#### Step 4: End of Session

1. `npx tsc --noEmit` passes
2. No uncommitted changes
3. On correct branch (NOT master)
4. progress.txt and features.json updated

When ALL features pass:
```bash
openclaw gateway wake --text "Done: [brief summary]" --mode now
```

---

## Sacred Rules

### features.json is IMMUTABLE (except `passes`)
- **NEVER** remove features, edit descriptions, or modify steps
- **ONLY** change `"passes": false` → `"passes": true` after verification
- It is **UNACCEPTABLE to remove or edit tests because this could lead to missing or buggy functionality**

### Feature Priority Order
1. `model` — TypeScript types/interfaces
2. `api` — API client + hooks (TanStack Query)
3. `store` — State management
4. `component` — Reusable UI components
5. `screen` — Full screens/pages
6. `navigation` — Expo Router routes
7. `e2e` — End-to-end flows

### NEVER Declare Victory Early
```bash
jq '[.features[] | .passes] | all' .claude/task/features.json
# Must return: true
```

---

## Testing Strategy

| Category | How to verify |
|----------|---------------|
| `model` | `npx tsc --noEmit` passes |
| `api` | TypeScript compiles + hook shape is correct |
| `store` | TypeScript compiles |
| `component` | `npx tsc --noEmit` + no crash on `npx expo start --web` |
| `screen` | Web preview renders without errors |
| `navigation` | Routes resolve correctly |
| `e2e` | Full flow works in web preview or Expo Go |

For web-testable features, use Puppeteer MCP:
```
puppeteer_navigate("http://localhost:8081")  # Expo web
puppeteer_screenshot()
puppeteer_click("[data-testid='...']")
```

---

## Existing App Architecture (Miguel's Code)

### Current Stack
| Technology | Purpose |
|------------|---------|
| Expo SDK 54 | Build + native APIs |
| Expo Router | File-based routing |
| TypeScript | Type safety |
| AsyncStorage | **100% local storage** (being replaced with API) |
| expo-print | PDF report generation |
| expo-camera / expo-image-picker | Photo capture |

### Current File Structure
```
app/
├── (tabs)/
│   ├── index.tsx                    # Home / Dashboard
│   ├── machine-list.tsx             # Machine registry
│   ├── machine-type-selection.tsx   # Select machine type for inspection
│   ├── new-machine.tsx              # Add new machine
│   ├── checklist.tsx                # Inspection checklist form
│   ├── photos.tsx                   # Photo capture during inspection
│   ├── comments.tsx                 # Comments for inspection
│   ├── report.tsx                   # PDF report preview
│   ├── acteco-inspections-list.tsx  # ACTECO emergency repair list
│   ├── acteco-report-form.tsx       # ACTECO report creation
│   ├── acteco-averia-form.tsx       # ACTECO fault details
│   ├── acteco-averia-photo.tsx      # ACTECO fault photos
│   ├── acteco-solucion-materiales.tsx # ACTECO solution + materials
│   ├── acteco-final-form.tsx        # ACTECO final details
│   ├── acteco-general-photo.tsx     # ACTECO general photos
│   ├── acteco-report-view.tsx       # ACTECO report viewer
│   └── explore.tsx                  # (Expo template, can be removed)
├── _layout.tsx                      # Root layout
└── modal.tsx                        # Modal screen

data/
├── machineTypes.ts          # Machine type taxonomy (8 types)
├── machineChecklists.ts     # Per-type checklist templates (key reference!)
└── checklistData.ts         # Checklist data helpers

utils/
├── storage.ts               # AsyncStorage for inspections (current data model)
├── actecoStorage.ts         # AsyncStorage for ACTECO repairs
├── actecoInspectionStorage.ts # ACTECO inspection storage
├── reportGenerator.ts       # PDF generation for inspections
├── actecoReportGenerator.ts # PDF generation for ACTECO reports
└── imageLoader.ts           # Image loading utilities

components/
├── ChecklistItem.tsx        # Individual checklist item component
├── PhotoCapture.jsx         # Camera component for photos
├── MachineCard.jsx          # Machine card in list
└── machine-list.tsx         # Machine list component
```

### Key Data Files

**`data/machineChecklists.ts`** — The crown jewel. Contains per-machine-type checklist templates with categories (General, Electrical, Hydraulic) and items. This data will be seeded into the backend.

**`utils/storage.ts`** — Current data model for inspections. Shows the shape of inspection records, responses, and photos. This is what we're replacing with API calls.

### Two Workflows
1. **Periodic Inspection** — machine-type-selection → checklist → photos → comments → report
2. **Emergency Repair (ACTECO)** — acteco-report-form → acteco-averia-form → photos → solution → final

---

## Domain Context

### What We're Building
Evolving Miguel's local-only inspection app into a cloud-connected platform that:
- Syncs with the Automisa backend API
- Supports multi-user (technicians in the field)
- Maintains offline capability (queue + sync)
- Generates PDF reports (keep existing functionality)
- Adds machine history, analytics, IoT data view

### Migration Strategy
- **Phase 1:** Add API client alongside AsyncStorage (dual-write)
- **Phase 2:** Replace AsyncStorage reads with API calls
- **Phase 3:** Remove AsyncStorage, full cloud
- **Keep:** PDF generation, camera, checklist UX (proven in field)

---

## Development Commands

```bash
npm install              # Install dependencies
npx expo start           # Start Expo dev server
npx expo start --web     # Web preview (for Puppeteer testing)
npx tsc --noEmit         # Type check
npx eslint .             # Lint
```

### Backend (must be running for API features)
```bash
# Postgres + Redis (Docker)
cd ~/projects/iot-platform/automisa-backend
docker compose -f docker-compose.dev.yml up -d postgres redis

# API service
DATABASE_URL="postgresql+asyncpg://iot:iot_secret@localhost:5433/iot_platform" \
REDIS_URL="redis://localhost:6380" \
poetry run uvicorn api.main:app --port 8001 --reload
```

---

## If You Get Stuck

1. Don't spin for >15 minutes
2. Document in `.claude/task/progress.txt`
3. Add `"blocked": "reason"` to the feature
4. Move to next feature

## If Something Breaks

```bash
git stash
git checkout HEAD -- [broken-file]
git reset --hard HEAD
git revert HEAD --no-edit
```
