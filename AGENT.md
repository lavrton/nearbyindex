# Purpose

This repository builds NearbyIndex (map-centric web app: search/click a point → compute infrastructure score; heatmap served from precomputed DB data; SEO city pages; multilingual).

## Where specs live

- All product + technical documentation lives in `/spec`.
- Current high-level docs may exist as `overview.md` and `steps.md`; plan is to split specs into multiple focused markdown files under `spec/` (e.g., `spec/architecture.md`, `spec/api.md`, `spec/db.md`, `spec/providers.md`, `spec/seo.md`, `spec/heatmap.md`).

## "Spec-first" workflow (important)

- Any change request that affects behavior, UI flows, APIs, data model, providers, scoring/heatmap mechanics, SEO/i18n, infra/hosting must be reflected back into the relevant `spec/*.md`.
- Keep specs concise and actionable:
  - what changed
  - why
  - acceptance criteria / constraints
  - migration notes (if DB/API changes)

## Engineering principles

- Prefer boring, maintainable solutions; keep the MVP minimal.

## Repo expectations

- Keep a clean separation between:
  - UI (Next.js web)
  - worker/scheduler (background jobs)
  - shared core (score engine, provider adapters, cache interfaces)
- Avoid storing secrets in repo. Use environment variables.

## When unsure

- If requirements are ambiguous, propose a minimal default and document the assumption in `spec/` with a clear TODO/decision point.
