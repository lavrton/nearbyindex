# Setup Guide

Complete setup instructions for NearbyIndex development and production environments.

## Prerequisites

### Required

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ (local installation or cloud service)

### For POI Data Import

The POI import script requires external CLI tools:

```bash
# Install Overture Maps CLI
pipx install overturemaps
# or: pip install overturemaps

# Install DuckDB
brew install duckdb
# or download from: https://duckdb.org/docs/installation
```

## Local Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd nearbyindex
pnpm install
```

### 2. Database Setup

**Option A: Local PostgreSQL**

```bash
# Create database
createdb nearbyindex

# Create environment file
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:
```
DATABASE_URL=postgresql://localhost:5432/nearbyindex
```

**Option B: Railway PostgreSQL**

1. Create a PostgreSQL instance on Railway
2. Copy the connection string
3. Create `apps/web/.env.local` with the DATABASE_URL

### 3. Initialize Database Schema

```bash
pnpm db:push
```

This creates all required tables:
- `cities` - City metadata and boundaries
- `overture_pois` - Points of interest from Overture Maps
- `heat_cells` - Precomputed heatmap grid cells
- `jobs` - Background job queue
- `point_scores` - Cached point score calculations
- `score_pois` - POI details for score calculations

### 4. Import POI Data

Import points of interest for your target region:

```bash
# Cancun (recommended for testing, ~30k POIs)
pnpm setup:pois:cancun

# Custom bounding box
pnpm setup:pois --bbox=<minLng>,<minLat>,<maxLng>,<maxLat>

# Worldwide (WARNING: ~50M+ POIs, 8-10GB download)
pnpm setup:pois:world
```

### 5. Start Development Server

```bash
pnpm dev
```

This starts:
- **Web server** on http://localhost:3000
- **Background worker** for job processing

## Production Database Setup

For development against the production database:

### 1. Create Production Environment File

Create `apps/web/.env.production.local` (gitignored):

```
DATABASE_URL=postgresql://user:pass@host:port/database
```

### 2. Push Schema to Production

```bash
pnpm db:push:prod
```

### 3. Seed Production Data

```bash
pnpm setup:pois:cancun:prod
```

### 4. Develop Against Production

```bash
pnpm dev:prod
```

## Environment Variables

See `apps/web/.env.example` for a complete template.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/nearbyindex` |

### Map Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler API key (optional) | - |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Map tile style URL | OpenFreeMap Liberty |

### POI Provider

| Variable | Description | Default |
|----------|-------------|---------|
| `POI_PROVIDER` | POI source: `localdb` or `overpass` | `localdb` |
| `NOMINATIM_USER_AGENT` | User agent for Nominatim geocoding | `nearbyindex/1.0` |
| `OVERPASS_API_URL` | Overpass API endpoint | `https://overpass-api.de/api/interpreter` |

### Localization

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default language | `en` |
| `SUPPORTED_LOCALES` | Comma-separated locale list | `en,de,es,fr` |

### Worker/Jobs

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKER_POLL_INTERVAL` | Job polling interval (ms) | `60000` |
| `WORKER_CHUNK_SIZE` | Cells processed per iteration | `50` |
| `MAX_CONCURRENT_JOBS` | Max parallel jobs | `1` |
| `CRON_SECRET` | Auth token for cron endpoint | - |

## Database Management

### View Database (Drizzle Studio)

```bash
pnpm db:studio        # Local database
pnpm db:studio:prod   # Production database
```

### Schema Changes

After modifying `lib/db/schema.ts`:

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate

# Or push directly (development)
pnpm db:push
```

## Verification

### Check Database Connection

```bash
pnpm db:studio
```

Should open Drizzle Studio in browser.

### Check POI Data

After importing, verify in Drizzle Studio:
- `overture_pois` table should have records
- For Cancun: ~30,000 POIs

### Check Application

1. Open http://localhost:3000
2. Map should load centered on default location
3. Click on map to calculate a point score
4. Heatmap overlay should display (if data computed)

## Troubleshooting

### "Connection refused" error

- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure database exists

### POI import fails

- Verify `overturemaps` CLI is installed: `overturemaps --version`
- Verify `duckdb` is installed: `duckdb --version`
- Check disk space (world import needs 10GB+)

### No heatmap displayed

Heatmap requires precomputed data. Either:
1. Wait for background worker to process jobs
2. Manually trigger: Click a point to auto-schedule heatmap computation
3. Check jobs: `pnpm db:studio` and view `jobs` table

### Worker not processing jobs

- Check worker is running (should show in `pnpm dev` output)
- Check for stale jobs in `jobs` table (status = 'running' for >10 minutes)
- Worker auto-resets stale jobs on startup
