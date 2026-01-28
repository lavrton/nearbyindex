# Scripts

CLI utilities for NearbyIndex development and operations.

## Worker Scripts

### worker.ts

**Main background worker for production.**

```bash
pnpm worker
```

- Continuously polls job queue
- Processes heatmap computation jobs
- Graceful shutdown on SIGTERM/SIGINT
- Auto-recovers stale jobs

Configuration via environment:
- `WORKER_POLL_INTERVAL` - Poll frequency (default: 60000ms)
- `WORKER_CHUNK_SIZE` - Cells per iteration (default: 50)

### process-jobs.ts

**One-shot job processor for development.**

```bash
tsx scripts/process-jobs.ts
```

- Processes all pending jobs then exits
- Larger chunks for faster local processing
- Useful for testing job logic

## Data Import Scripts

### setup-overture.ts

**Import POI data from Overture Maps.**

```bash
# Predefined regions
pnpm setup:pois:cancun        # Cancun (~30k POIs)
pnpm setup:pois:world         # Worldwide (~50M POIs)

# Custom bounding box
pnpm setup:pois --bbox=<minLng>,<minLat>,<maxLng>,<maxLat>

# Production database
pnpm setup:pois:cancun:prod
```

**Prerequisites:**
- `overturemaps` CLI: `pipx install overturemaps`
- `duckdb` CLI: `brew install duckdb`

**Process:**
1. Downloads data via Overture Maps CLI (geoparquet)
2. Processes with DuckDB to extract relevant fields
3. Batch imports to `overture_pois` table

### precompute-heatmap.ts

**Manual heatmap precomputation.**

```bash
# Predefined city
pnpm heatmap:compute --city cancun

# Custom bounds
tsx scripts/precompute-heatmap.ts --bbox=<minLat>,<minLng>,<maxLat>,<maxLng> --step=0.005

# Dry run (no database writes)
tsx scripts/precompute-heatmap.ts --city cancun --dry-run
```

**Grid step sizes:**
- `0.01` = ~1 km
- `0.005` = ~500 m
- `0.0025` = ~250 m (default for jobs)

## Diagnostic Scripts

### check-jobs.ts

**View recent job status.**

```bash
tsx scripts/check-jobs.ts
```

Shows last 10 jobs with:
- ID, type, status
- Progress percentage
- Creation time
- City/grid info

### check-heatmap.ts

**Verify heatmap data coverage.**

```bash
tsx scripts/check-heatmap.ts
```

### check-all-data.ts

**Comprehensive data health check.**

```bash
tsx scripts/check-all-data.ts
```

Checks:
- POI counts
- Heatmap cell counts
- Job queue status
- City data

## Utility Scripts

### reset-and-schedule-cancun.ts

**Reset and reschedule Cancun heatmap computation.**

```bash
tsx scripts/reset-and-schedule-cancun.ts
```

Use when:
- Need to recompute heatmap from scratch
- Testing job processing
- Recovering from failed jobs
