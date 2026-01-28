# Worker & Job System

Background job processing system for NearbyIndex heatmap computation.

## Overview

NearbyIndex uses a polling-based job processor that runs as a separate service. Jobs are stored in PostgreSQL and processed asynchronously to compute heatmap grid cells.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Job Creation   │────▶│   Jobs Table    │────▶│     Worker      │
│  (API/Auto)     │     │   (Postgres)    │     │   (Processor)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   heat_cells    │
                                                │   (Results)     │
                                                └─────────────────┘
```

## Running the Worker

### Development

Worker runs automatically with the dev server:

```bash
pnpm dev        # Runs web + worker concurrently
```

Or run worker separately:

```bash
pnpm worker     # Standalone worker process
```

### Production (Railway)

Deploy as separate Railway service:

- **Start command:** `pnpm worker`
- **Health check:** Worker logs heartbeat every poll interval

## Job Types

Currently supported job types:

| Type | Description |
|------|-------------|
| `heatmap_compute` | Compute grocery scores for grid cells in a region |

## Job Lifecycle

```
pending → running → completed
                  → failed
```

### States

| Status | Description |
|--------|-------------|
| `pending` | Job queued, waiting for worker |
| `running` | Worker is processing the job |
| `completed` | Job finished successfully |
| `failed` | Job failed (see `error` column) |

### Automatic Recovery

- Jobs stuck in `running` for >10 minutes are reset to `pending`
- Worker checks for stale jobs on startup and every poll cycle

## Job Creation

### 1. Via API Endpoint

```bash
POST /api/heatmap/schedule
Content-Type: application/json

{
  "citySlug": "cancun",
  "gridStep": 0.0025
}
```

Response:
```json
{
  "jobId": 42,
  "status": "pending",
  "isNew": true
}
```

### 2. Automatic (On-Demand)

When a user clicks a point without heatmap coverage:
1. Score API checks `hasHeatmapCoverage(lat, lng)`
2. If missing, calls `ensureHeatmapCoverage(lat, lng)`
3. Creates a 15km x 15km regional job around the point
4. User gets score immediately; heatmap computes in background

### 3. Manual (Scripts)

```bash
# Schedule via script
pnpm --filter @nearbyindex/web tsx scripts/reset-and-schedule-cancun.ts
```

## Job Processing

### How It Works

1. Worker polls `jobs` table every 60 seconds (configurable)
2. Gets oldest `pending` job (FIFO queue)
3. Marks job as `running`
4. Processes in chunks (default 50 cells per iteration)
5. Updates progress after each chunk
6. Marks `completed` when done

### Chunk Processing

Each chunk:
1. Generates grid points within job bounds
2. Calculates grocery score for each point (using in-memory POI data)
3. Batch inserts/upserts to `heat_cells` table
4. Updates job progress and metadata

### Batch Processing Optimization

For remote databases (Railway, etc.), the worker uses an optimized batch processing mode:

1. **On job start**: Loads ALL grocery POIs for the job region into memory (single DB query)
2. **Score calculation**: Computes scores using in-memory lookups (no network calls)
3. **Result writes**: Batches INSERT operations for efficiency

This optimization provides ~100x speedup for remote databases by eliminating per-cell network round trips.

**Before optimization:** ~10 cells/second (network-bound)
**After optimization:** ~500-1000+ cells/second (CPU-bound)

### Progress Tracking

Jobs track:
- `progress`: 0-100 percentage
- `totalItems`: Total grid cells to compute
- `metadata.lastProcessedIndex`: Resume point if interrupted

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKER_POLL_INTERVAL` | How often to check for jobs (ms) | `60000` |
| `WORKER_CHUNK_SIZE` | Cells per processing iteration | `500` |
| `MAX_CONCURRENT_JOBS` | Maximum parallel jobs | `1` |

**Note:** With batch processing enabled, `WORKER_CHUNK_SIZE` can be set much higher (500-1000) since score calculations are now CPU-bound, not network-bound.

### Grid Resolution

| Grid Step | Approximate Distance | Cells per 15km region |
|-----------|---------------------|----------------------|
| `0.01` | ~1 km | ~225 |
| `0.005` | ~500 m | ~900 |
| `0.0025` | ~250 m | ~3,600 |
| `0.001` | ~100 m | ~22,500 |

## Monitoring Jobs

### Check Job Status

```bash
# View in Drizzle Studio
pnpm db:studio

# Or via API
GET /api/jobs/:id
```

### Job Status API Response

```json
{
  "id": 42,
  "type": "heatmap_compute",
  "status": "running",
  "progress": 45,
  "totalItems": 3600,
  "error": null,
  "createdAt": "2025-01-28T10:00:00Z",
  "startedAt": "2025-01-28T10:05:00Z",
  "completedAt": null
}
```

### Worker Logs

Worker outputs progress:

```
Background Worker Started
=========================
Poll interval: 60000ms
Chunk size: 50

[10:05:00] Started job #42 (heatmap_compute) - 3600 items
[10:05:30] Job #42 progress: 5% (180/3600 cells)
[10:06:00] Job #42 progress: 10% (360/3600 cells)
...
[10:45:00] Job #42 completed - 3600 cells processed
```

## Database Schema

### jobs Table

```sql
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,          -- 'heatmap_compute'
  status VARCHAR(20) NOT NULL,        -- 'pending'|'running'|'completed'|'failed'
  city_id INTEGER REFERENCES cities,  -- Optional city reference
  progress INTEGER DEFAULT 0,         -- 0-100
  total_items INTEGER,                -- Total work units
  error TEXT,                         -- Error message if failed
  metadata JSONB,                     -- Job-specific data
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_type_idx ON jobs(type);
```

### heat_cells Table

```sql
CREATE TABLE heat_cells (
  id SERIAL PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  score INTEGER NOT NULL,             -- 0-100
  grid_step REAL NOT NULL,            -- Resolution (0.0025, etc.)
  city_id INTEGER REFERENCES cities,
  computed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lat, lng, grid_step)
);

CREATE INDEX heat_cells_bounds_idx ON heat_cells(lat, lng);
```

## Utility Scripts

| Script | Purpose |
|--------|---------|
| `scripts/worker.ts` | Main worker process |
| `scripts/process-jobs.ts` | One-shot job processor (dev) |
| `scripts/check-jobs.ts` | View recent job status |
| `scripts/reset-and-schedule-cancun.ts` | Reset and reschedule Cancun |

## Troubleshooting

### Jobs Stuck in "running"

Jobs older than 10 minutes are auto-reset. To force reset:

```sql
UPDATE jobs SET status = 'pending', started_at = NULL
WHERE status = 'running';
```

### Worker Not Processing

1. Check DATABASE_URL is set
2. Check worker is running (`pnpm dev` shows worker output)
3. Check for pending jobs in database
4. Check worker logs for errors

### Slow Processing

- Processing is CPU-bound after POI data is loaded into memory
- Increase `WORKER_CHUNK_SIZE` to 500-1000 for better throughput
- Reduce chunk size if memory limited (each POI uses ~50 bytes)
- Typical speed with batch processing: 500-1000 cells/second
- Full city at 250m resolution: ~10-20 minutes

### Duplicate Jobs

The scheduler prevents duplicates:
- Won't create new job if one exists for same city
- `scheduleHeatmapJob` returns existing job if found

## Cron Trigger (Alternative)

For environments without long-running workers, use HTTP cron:

```
GET /api/cron/process-jobs
Authorization: Bearer <CRON_SECRET>
```

Configure external cron service (Railway Cron, Vercel Cron, etc.) to call this endpoint periodically.
