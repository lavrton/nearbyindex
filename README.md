# NearbyIndex

Map-centric web app that computes a place score from nearby infrastructure and renders a heatmap overlay.

**Domain:** nearbyindex.com

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (local or Railway)
- For POI data import: `pipx install overturemaps` and `brew install duckdb`

### Setup

```bash
# Clone and install dependencies
git clone <repo>
cd nearbyindex
pnpm install

# Set up local database
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your DATABASE_URL

# Push database schema
pnpm db:push

# Import POI data (Cancun as example)
pnpm setup:pois:cancun

# Start development server
pnpm dev
```

Open http://localhost:3000

## Development Modes

### Local Development (local database)

```bash
pnpm dev          # Web server + background worker
pnpm dev:web      # Web server only
```

### Development with Production Database

```bash
# Create .env.production.local with production DATABASE_URL
pnpm dev:prod     # Web server + worker using production db
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with worker |
| `pnpm dev:prod` | Start dev server using production database |
| `pnpm build` | Build for production |
| `pnpm db:push` | Push schema to local database |
| `pnpm db:push:prod` | Push schema to production database |
| `pnpm db:studio` | Open Drizzle Studio (local db) |
| `pnpm db:studio:prod` | Open Drizzle Studio (production db) |
| `pnpm setup:pois:cancun` | Import Cancun POI data to local db |
| `pnpm setup:pois:cancun:prod` | Import Cancun POI data to production db |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web (Next.js) │────▶│   PostgreSQL    │
│   Port 3000     │     │                 │
└─────────────────┘     │  - cities       │
                        │  - overture_pois│
┌─────────────────┐     │  - heat_cells   │
│     Worker      │────▶│  - jobs         │
│  (Background)   │     │                 │
└─────────────────┘     └─────────────────┘
```

- **Web**: Next.js app serving UI and API endpoints
- **Worker**: Background job processor for heatmap computation
- **PostgreSQL**: Primary data store

## Documentation

- [Technical Overview](spec/OVERVIEW.md) - Architecture and requirements
- [Setup Guide](spec/SETUP.md) - Detailed setup instructions
- [Worker System](spec/WORKER.md) - Background job processing

## Project Structure

```
nearbyindex/
├── apps/
│   └── web/                 # Next.js application
│       ├── app/             # App router pages and API
│       ├── components/      # React components
│       ├── lib/             # Core libraries
│       │   ├── db/          # Database schema and connection
│       │   ├── jobs/        # Job scheduler and processor
│       │   └── scoring/     # Score calculation logic
│       └── scripts/         # CLI scripts
├── spec/                    # Technical specifications
└── package.json             # Root workspace config
```
