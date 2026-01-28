NearbyIndex — Technical Requirements & Architecture (MVP → v1)

Domain: nearbyindex.com
Product: map-centric web app that computes a place score from nearby infrastructure and renders a heatmap overlay from precomputed data.

⸻

0. Goals and constraints

Must-haves (MVP)
• No login/auth at start.
• Map-centric UI (minimalistic, Google Maps-like).
• User can search an address or click/select on the map.
• When a point/address is selected: calculate a score (formula TBD later).
• Score UI supports progressive loading: show partial results immediately, continue loading remaining categories.
• Heatmap overlay is served only from database/cache (no live recompute on pan).
• Heatmap freshness target: weekly or monthly.
• Worldwide coverage.
• Modern tech stack.
• Multilingual architecture from day 1.
• SEO-friendly programmatic pages for cities (areas/neighborhoods optional later).
• Point permalinks are shareable but not in sitemap.

Non-goals (MVP)
• Public API (keep endpoints private-by-default).
• Travel time routing (use distance-only for MVP).
• User-generated content.
• Address-level SEO at launch.

⸻

1. High-level architecture (Railway + Postgres)

Services (Railway) 1. web (Next.js)
• Serves UI (map app + SEO pages)
• Server-side endpoints for scoring and heatmap tiles
• Multilingual routing and metadata 2. worker (Node.js service)
• Scheduled jobs (Railway Cron / Scheduled Jobs)
• Batch precompute for heatmap grids/tiles
• Cache warming and refresh processes 3. postgres (Railway managed Postgres)
• Primary data store for application state, caching, and heatmap data

Optional (later, not MVP)
• CDN in front of Railway (e.g., Cloudflare) to cache heatmap tiles globally.
• Object storage for large tile blobs if Postgres becomes heavy.
• Redis for hot caching/rate limiting if traffic or abuse grows.

⸻

2. Frontend requirements (Next.js)

Framework
• Next.js (App Router).
• SSR/SSG/ISR where appropriate for SEO pages.

Map rendering
• Use a map library that keeps basemap provider switchable (default plan: MapLibre GL JS).
• Basemap style URL and API keys are configuration-driven (environment variables).

Core UX flows 1. Explore
• Full-screen map
• Search box (geocoding)
• Heatmap toggle (enabled by default)
• Category filter UI (even if scoring formula evolves later)
• Auto-detect user location on page load:
  - Request browser geolocation permission on first visit
  - If granted, center map on user's location
  - If denied or unavailable, fallback to default location (Berlin)
  - Silent failure (no error shown to user) 2. Select point
• Click map to pick lat/lng
• Search address to pick lat/lng 3. Score panel
• Immediate skeleton/pre-score state
• Progressive category loading states
• "Explainability" per category (counts, nearest distances, availability flags)
• Click category row to show POIs on map:
  - Displays markers for all POIs in that category (up to 20 nearest)
  - Each marker shows popup on hover with place name and distance
  - Click same category again to hide markers
  - Category row highlights when active with color-coded icon 4. Permalinks
• City pages (indexable): /{locale}/city/{slug}
• Point pages (shareable, noindex): /{locale}/p/{lat},{lng}

⸻

3. SEO + multilingual requirements

SEO pages (launch)
• Programmatic pages for cities.
• Optional later: programmatic pages for neighborhoods/areas.
• City pages should be indexable and include:
• Localized title + description
• Minimal static copy block (templated initially)
• Internal links to other city pages
• Optional later: “popular areas” and “typical score ranges”

Sitemap strategy
• Include city pages in sitemap.
• Exclude point pages from sitemap.

Indexing strategy for point pages
• Point pages should default to noindex,follow (configurable later).

Internationalization
• Locale in URL path: /{locale}/...
• Localized metadata and page content.
• hreflang support for alternate languages.
• Translation dictionaries stored in repo for MVP (upgrade to CMS later if needed).

⸻

4. Backend API (private-by-default, API-ready)

Design principles
• Endpoints are internal for the web app initially.
• Implement “API-ready” separation:
• Clear request/response contracts
• Versioned score model
• Rate limiting and abuse controls
• Keep room for future public API monetization with minimal refactors.

Key endpoints (conceptual)
• Score calculation endpoint (point score)
• Heatmap tile endpoint
• Geocoding proxy endpoints (optional; to keep provider keys private)

⸻

5. Provider-agnostic Data Adapter Layer (critical requirement)

Motivation
• Ability to switch/add/remove providers without rewriting the score engine or UI.
• Support open data providers now and premium providers later.

Provider interfaces
• Geocoding provider
• Search address query to coordinate candidates
• Reverse geocode coordinate to display label and components
• POI provider
• Fetch nearby POIs by categories and radius
• Boundary provider (later)
• City boundary polygon
• Neighborhood/area polygons

Normalization
• Normalize all provider responses into internal canonical schemas:
• Unified POI schema
• Unified category taxonomy
• Unified error/availability flags

Configuration
• Provider selection via environment variables and feature flags:
• Choose provider per capability (geocode vs POI)
• Enable fallback provider chain if needed
• All provider calls are traceable (latency/error metrics).

Error handling and retry logic
• Rate limiting (429) and server errors (5xx) trigger automatic retry
• Exponential backoff with jitter: 1s, 2s, 4s (max 10s)
• Maximum 3 retries before failing
• Silent logging of retry attempts for debugging

⸻

6. Canonical categories (MVP)

Use a fixed taxonomy from day one; provider-specific categories map into these:
• Shops (grocery/retail)
• Restaurants/cafes
• Schools
• Parks/green areas
• Public transit
• Healthcare
• Safety/crime (may start as proxy signals; improve later)
• Gyms/sports facilities
• Childcare
• Nightlife

Notes:
• Some categories may not be available globally; scoring must handle “not available” gracefully.

⸻

7. Score engine (mechanics; formula later)

There are two distinct scoring contexts:

Point score (on-demand, full detail)
• Triggered when user clicks/selects a specific location.
• Uses all canonical categories (groceries, restaurants, schools, transit, etc.).
• Returns comprehensive breakdown with explainability.

Heatmap score (precomputed, simplified)
• Uses a simplified subset of categories for MVP (groceries only).
• Precomputed for grid cells and stored in database.
• Designed for quick visual overview, not detailed analysis.
• See Section 8 for heatmap-specific details.

Point score inputs
• Coordinate (lat/lng)
• List of categories
• Radius in meters (distance-based for MVP)
• Versioned scoring configuration (model version + taxonomy version)

Point score outputs
• Total score
• Per-category scores
• Explainability details:
  • POI counts per category
  • Nearest POI distance
  • Density within radius
  • Data availability flags and warnings
• POI list per category (up to 20 nearest):
  • ID, coordinates, name, distance from selected point
  • Used for displaying markers on map when category is clicked

Progressive computation (point scores only)
• First response includes cached/available categories immediately.
• Missing categories are fetched and computed asynchronously.
• Client receives updates via polling or incremental fetch.

Versioning
• Every computed score is tied to:
• Score model version
• Taxonomy version
• Bumping versions invalidates prior caches safely.

⸻

8. Heatmap strategy (weekly/monthly, DB-only serving)

Concept
• Heatmap is served only from stored data, never computed live during pan/zoom.
• Heatmap uses a simplified score (groceries only for MVP) — not the full category set.
• Purpose: provide a quick visual overview; detailed scores come from clicking a point.

Precompute unit
• A grid of cells covering a city (simple bounding box for MVP).
• Later upgrade path to official boundary polygons.

Storage approach
• Store JSON cell data in Postgres (not pre-rendered image tiles).
• Each cell contains: coordinates, simplified score value, and basic metadata.
• API returns JSON for requested viewport/zoom level.
• Client renders the heatmap visualization from JSON data (colors, opacity, etc.).

Visualization approach
• Grid cells rendered as filled squares (not density-based heatmap blobs)
• Single-hue purple gradient (avoids "good/bad" judgment):
  - Light purple (score 0-25): Fewer amenities nearby
  - Medium purple (score 50): Moderate amenities
  - Deep purple (score 75-100): Many amenities nearby
• Opacity scales with score: low scores more transparent (0.15), high scores more visible (0.65)
• Empty areas (no data) remain transparent - appropriate for ocean, forests, uncomputed regions
• Fetch bounds padded by 50% for smoother panning experience
• Layer inserted below map labels for better readability
• Cell size matches precompute grid step (0.01° ≈ 1km)

Benefits of client-side rendering:
• Smaller storage footprint (numeric data vs image blobs).
• Flexibility to change visualization style without regenerating data.
• Easier to iterate on color schemes, thresholds, and rendering logic.

Refresh policy
• Weekly or monthly recompute for prioritized cities.
• Optional on-demand fill:
• If a city is missing heatmap data, enqueue jobs to compute it.

Manual precompute (MVP)
• CLI script: `pnpm heatmap:compute --city <name>`
• Supported cities: berlin, munich, hamburg, vienna, paris, cancun
• Custom bounds: `pnpm heatmap:compute --bbox minLat,minLng,maxLat,maxLng`
• Grid step configurable (default 0.01° ≈ 1km)
• Batched API calls with rate limit handling (5 concurrent, 2s delay between batches)
• Stores results in heat_cells table

⸻

9. Scheduled jobs and worker design (Railway)

Worker deployment (Railway)
• Run as separate Railway service from same codebase
• Start command: `pnpm worker`
• Polls jobs table continuously (no external cron needed)
• Graceful shutdown on SIGTERM

Cron jobs
• Refresh top cities (weekly/monthly):
• Determine target cities by traffic rank
• Enqueue compute jobs
• Maintenance (daily or weekly):
• Prune expired cache entries
• Basic housekeeping

Job execution
• Worker processes a jobs queue in Postgres.
• Supports retries with backoff for provider outages.
• Records job runtime metrics and errors.

⸻

10. Database (Postgres) — data model overview

Core tables
• Cities
• Slug, country, localized names, center point, bounding box, popularity rank
• Point score cache
• Cached computed scores keyed by cell/rounded coordinate + radius + model version
• Expiration time and computed timestamp
• Heat cells
• Precomputed grid cells with simplified score values (groceries only for MVP)
• Stored per city and model version
• Contains: cell coordinates, score value, metadata (e.g., POI count)
• JSON data served to client for rendering (no image storage)
• Jobs queue
• Job type, payload, status, attempts, run-after timestamps, created/updated timestamps

Indexing strategy (conceptual)
• Fast lookups by city slug and country.
• Fast lookups for cached point score entries by key + version.
• Fast retrieval for heatmap by city and cell/tile identifiers.
• Job queue index for status and run-after.

⸻

11. Rate limiting and abuse control (no CAPTCHA at start)

Goals
• Protect provider costs and prevent casual scraping.
• Keep UX friction low.

MVP approach
• IP-based rate limits on:
• score requests
• geocoding requests (if proxied)
• tile requests (separate bucket)
• Store counters in Postgres at MVP scale.

Future-ready hooks
• Feature flag for anti-bot challenge if abuse rises.
• Optional move rate limiting to Redis if needed.

⸻

12. Observability

Analytics
• Plausible for page views and high-level events.

Logging and metrics
• Provider latency and error rates.
• Cache hit rates (score cache and heatmap).
• Job queue throughput and failure rates.

Error tracking (recommended)
• Sentry (or equivalent).

⸻

13. Deployment and environments (Railway)

Components
• Web service: Next.js app.
• Worker service: job processor + scheduled tasks.
• Postgres: Railway managed.

Environments
• Development
• Staging
• Production

Configuration (examples, conceptual)
• Database URL
• Provider selection flags
• Provider API keys
• Map style URL and keys
• Locale list
• Scoring model version and taxonomy version
• Rate limit thresholds

⸻

14. MVP roadmap (phased)

Phase 1 — Map + point score
• Map UI + search + click-to-select
• Geocoding and reverse label
• Score endpoint with progressive results
• Basic Postgres caching for point scores
• Point permalink pages with noindex

Phase 2 — SEO cities
• Cities dataset and city pages per locale
• Sitemap for city pages
• hreflang and localized metadata

Phase 3 — Heatmap v1
• Pick one pilot city and implement grid precompute
• Serve heat overlay from stored data
• Weekly/monthly cron refresh

Phase 4 — Scale and cost control
• Traffic-based city prioritization
• Smarter caching and provider fallback strategies
• Optional CDN caching for tiles and static assets

⸻

15. Explicit open decisions
    • Initial provider choices for:
    • geocoding
    • nearby POIs
    • safety/crime proxy data
    • Grid system for MVP:
    • simple lat/lng grid vs H3/S2 (later)
    • Whether to introduce PostGIS early (likely not for MVP)
    • Whether to proxy all provider requests through backend (recommended to protect keys)

⸻

16. Related Documentation

• [Setup Guide](SETUP.md) — Development and production setup instructions
• [Worker System](WORKER.md) — Background job processing architecture
• [Project README](../README.md) — Quick start and overview
