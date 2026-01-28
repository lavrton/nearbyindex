# What to ask agents to do (high-level task list)

You can paste these as separate tasks to different agents.

---

## Agent task A — "Architecture & repo plan"

- Propose repo structure (web/worker/shared)
- Environments (dev/staging/prod) and config strategy
- Railway services layout and deployment approach

**Output:** architecture doc + repo skeleton plan.

---

## Agent task B — "Provider research & cost/risk"

- Compare 2–3 geocoders, 2–3 POI providers, 2–3 tile providers
- Include pricing model, quotas, attribution/legal constraints, global coverage notes

**Output:** provider decision memo + recommended default.

---

## Agent task C — "Taxonomy + normalization"

- Canonical categories
- Provider-to-canonical mapping
- Normalized POI schema

**Output:** taxonomy doc + mapping table.

---

## Agent task D — "Score contract v0 + UX states"

- Define score request/response structure
- Define progressive loading model
- Define explainability fields

**Output:** API contract + UI state diagram.

---

## Agent task E — "Heatmap MVP design"

- Decide cells-first vs tiles-materialized for pilot city
- Define grid resolution and refresh job
- Define DB schema additions

**Output:** heatmap design doc + schema changes.

---

## Agent task F — "Database schema + migrations"

- Create schema v1 (tables/indexes/retention)
- Choose migration tooling

**Output:** schema SQL + migration plan.

---

## Agent task G — "SEO + i18n implementation plan"

- City pages generation strategy (ISR/SSG)
- hreflang approach
- sitemap rules

**Output:** SEO plan + i18n plan.

---

## Agent task H — "Roadmap & acceptance criteria"

- Break into milestones
- Define acceptance tests per milestone

**Output:** roadmap board-style list + acceptance criteria.

---

## Concrete "pre-code" checklist

_(You do this, then coding starts)_

1. Pick default providers (even if swappable).
2. Freeze taxonomy + normalized schema.
3. Freeze score contract v0 (mechanics + progressive model).
4. Decide heatmap storage mode for MVP.
5. Approve DB schema v1 and migration tooling.
6. Approve API contracts.
7. Approve SEO/i18n routing + sitemap rules.
8. Approve milestone plan and acceptance criteria.

Once those are done, coding becomes straightforward and you avoid the big rewrites.

If you want, I can turn this into a short "project brief" you can hand to a developer team (one page) plus a "definition of done" checklist per milestone.
