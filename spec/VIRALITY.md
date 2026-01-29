# NearbyIndex — Virality & Shareability Spec

This document defines the viral mechanics, product voice, and share artifacts designed to maximize organic sharing and word-of-mouth growth.

---

## 1. Product Voice

### Tone: Playful Roasty

The copy layer uses light teasing and meme-adjacent humor. The goal is to make users laugh, screenshot, and share — even when their score is bad.

**Voice characteristics:**

- Witty, not mean
- Self-aware and internet-native
- Short, punchy sentences
- Avoids corporate speak

**Examples:**

- Good: "15 bars within walking distance. Zero grocery stores. We see you."
- Good: "This spot has it all. Suspiciously perfect. Are you a real estate agent?"
- Bad: "Your location has suboptimal grocery coverage." (too corporate)
- Bad: "Wow, this place sucks!" (too harsh)

### Safety Guardrails

The following topics are **strictly off-limits** in generated copy:

| Forbidden                                         | Reason                    |
| ------------------------------------------------- | ------------------------- |
| Protected classes (race, religion, gender, etc.)  | Legal and ethical         |
| Crime, safety, or "dangerous neighborhood" claims | Liability, stigmatization |
| Property values or investment advice              | Financial liability       |
| References to tragedy, violence, or disasters     | Tasteless                 |
| Specific business names (positive or negative)    | Defamation risk           |
| Personally identifiable information               | Privacy                   |

All copy must pass this check: "Would this be okay if it went viral on Twitter and got quoted by a journalist?"

---

## 2. The Viral Loop

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  TRIGGER    │ ──▶ │   MOMENT    │ ──▶ │  ARTIFACT   │ ──▶ │ DISTRIBUTION│
│             │     │             │     │             │     │             │
│ User checks │     │ Gets funny  │     │ Share card  │     │ Posts to    │
│ their home  │     │ roast/badge │     │ with badge  │     │ social/DM   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                              ┌─────────────────────────────┐
                                              │         RE-ENTRY            │
                                              │                             │
                                              │ Friend sees card, wants to  │
                                              │ check their own location    │
                                              └─────────────────────────────┘
```

**Key insight:** The artifact must be worth sharing even when the score is low. This is why badges and roasts work — they turn a "bad" result into a funny/relatable moment.

---

## 3. Naming Change: Convenience Score

### Current State

The UI and share cards use "Infrastructure Score" — accurate but utilitarian and forgettable.

### New Standard

All user-facing text should use **"Convenience Score"**.

**Why this name:**

- Consumer-friendly (not B2B/gov speak)
- Implies personal benefit ("convenient for me")
- Works across cultures and languages
- Short enough for share cards

**Where to update (implementation phase):**

- `ShareCard.tsx` line 221: "Infrastructure Score" → "Convenience Score"
- `ShareCardSocial.tsx` line 230: same
- `ShareModal.tsx` lines 139, 154: share text templates
- Score panel component header
- All translation dictionary entries
- SEO meta descriptions for city pages

---

## 4. P0: Roast/Toast "Vibe Check" (AI-Powered)

### Concept

A 1–2 sentence AI-generated caption that interprets the score breakdown with personality. Each comment is unique and surprising. Displayed on the score panel and embedded in share cards.

### User Story

> As a user who just scored my location, I want a funny/insightful one-liner so I have something worth screenshotting and sharing.

### Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Score Panel  │────▶│  /api/vibe   │────▶│   OpenAI     │
│   (Client)   │     │   (Server)   │     │  GPT-4o-mini │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │    Cache     │
       │             │  (Postgres)  │
       │             └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────────────┐
│  Loading state → AI comment OR       │
│  fallback template if error/timeout  │
└──────────────────────────────────────┘
```

### Provider

**OpenAI** with model `gpt-4o-mini` (fast, cheap, good at short creative copy).

**Environment variable:** `OPENAI_API_KEY`

### API Endpoint

**`POST /api/vibe`**

Request:

```typescript
interface VibeRequest {
  overall: number;
  categories: { id: string; score: number }[];
  locale?: string; // For localized responses
}
```

Response:

```typescript
interface VibeResponse {
  comment: string;
  cached: boolean;
  generatedAt: string; // ISO timestamp
}
```

**Error response** (fallback triggers on client):

```typescript
interface VibeError {
  error: string;
  fallback: string; // Simple template-based fallback
}
```

### Async Loading UX

Since AI generation takes 1–3 seconds, the vibe comment loads separately from the score:

1. Score panel renders immediately with scores + badge
2. Vibe comment area shows skeleton/shimmer loader
3. Client calls `/api/vibe` in the background
4. On success: fade in the AI comment
5. On error/timeout (5s): show fallback template

**UI states:**

- `loading` — Shimmer placeholder (e.g., "Generating your vibe...")
- `success` — AI-generated comment with subtle fade-in
- `error` — Fallback template (no error shown to user)

### Caching Strategy

**Cache by exact score values** to minimize API costs while preserving variety.

**Cache key format:**

```
vibe:{overall}:{groceries}:{restaurants}:{transit}:{healthcare}:{education}:{parks}:{shopping}:{entertainment}:{locale}
```

Example: `vibe:72:85:60:45:70:55:80:40:30:en`

**Cache storage:** Postgres table `vibe_cache`

```sql
CREATE TABLE vibe_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0
);
```

**Cache behavior:**

- If cache hit: return immediately (no API call)
- If cache miss: call OpenAI, store result, return
- No TTL (comments don't expire — same scores = same vibe)
- Optional: add `hit_count` tracking for analytics

### Fallback Templates

If OpenAI fails (timeout, rate limit, API error), return a simple deterministic fallback:

| Pattern    | Condition     | Fallback Copy                                      |
| ---------- | ------------- | -------------------------------------------------- |
| High score | overall >= 80 | "Looking good! This spot has serious convenience." |
| Mid score  | overall 40-79 | "Not bad. Room to explore though."                 |
| Low score  | overall < 40  | "Off the beaten path. Bring snacks."               |

Fallback is also used as the initial value in share cards if the vibe hasn't loaded yet.

### Prompt Engineering

**System prompt:**

```
You are a witty, internet-native copywriter for a location scoring app called NearbyIndex.
Your job is to write a single 1-2 sentence "vibe check" comment based on a location's convenience scores.

RULES:
- Maximum 120 characters
- Be playful and slightly roasty, but never mean
- Reference specific category contrasts when interesting (e.g., "lots of bars, no groceries")
- No emojis
- No hashtags
- Never mention specific addresses, neighborhoods, or place names
- Never reference crime, safety, property values, or protected classes
- End with a period or question mark

TONE EXAMPLES:
- Score 95: "Suspiciously perfect. Are you a real estate agent?"
- Score 23: "Certified off-grid vibes. Hope you like hiking for milk."
- High bars, low groceries: "Your liver's happy. Your fridge? Not so much."
```

**User prompt:**

```
Overall score: {overall}/100

Category breakdown:
- Groceries: {groceries}
- Restaurants: {restaurants}
- Transit: {transit}
- Healthcare: {healthcare}
- Education: {education}
- Parks: {parks}
- Shopping: {shopping}
- Entertainment: {entertainment}

Write a vibe check comment for this location.
```

### Localization

For non-English locales, append to the system prompt:

```
Respond in {locale_name} (e.g., "German", "Spanish").
Keep the same playful tone but use culturally appropriate humor.
```

### Rate Limiting & Cost Control

- **Per-IP rate limit:** 10 vibe requests per minute (matches score rate limit)
- **Estimated cost:** ~$0.0001 per generation (GPT-4o-mini)
- **Monthly budget alert:** Set up OpenAI spending limit

### Implementation Files

Create `lib/vibe/` folder with:

- `api.ts` — OpenAI client wrapper and prompt construction
- `cache.ts` — Postgres cache read/write functions
- `fallback.ts` — Deterministic fallback templates
- `types.ts` — Request/response types

Create `app/api/vibe/route.ts` for the API endpoint.

### Copy Rules (Enforced via Prompt)

- Maximum 120 characters (fits in a tweet, looks good on cards)
- No emojis
- No hashtags
- Always ends with a period or question mark
- Never references specific locations, addresses, or neighborhoods
- Adheres to safety guardrails in Section 1

---

## 5. P0: Badge System

### Concept

Visual badges awarded based on score patterns. Badges make low scores shareable ("look at my chaos badge") and high scores flex-worthy.

### User Story

> As a user with an unusual score pattern, I want a badge that labels my location's personality so I can share it as a meme or brag.

### Badge Taxonomy

| ID                 | Title                | One-liner                  | Trigger Condition                                      |
| ------------------ | -------------------- | -------------------------- | ------------------------------------------------------ |
| `perfect-spot`     | Perfect Spot         | The urban planning dream   | overall >= 95                                          |
| `15min-hero`       | 15-Minute Hero       | Everything walkable        | groceries >= 80 AND transit >= 80 AND healthcare >= 70 |
| `night-owl`        | Night Owl            | Bars > groceries           | entertainment >= 70 AND groceries <= 40                |
| `suburban-dream`   | Suburban Dream       | Kids and dogs thrive here  | education >= 70 AND parks >= 70 AND entertainment <= 30 |
| `food-desert`      | Food Desert Survivor | Uber Eats MVP              | groceries <= 20                                        |
| `car-required`     | Car Required         | Transit? Never heard of it | transit <= 15                                          |
| `certified-chaos`  | Certified Chaos      | Embrace the mess           | overall <= 25                                          |
| `off-grid`         | Off-Grid Legend      | Civilization is optional   | overall <= 15 AND parks >= 50                          |
| `workaholic-zone`  | Workaholic Zone      | All work, no play          | entertainment <= 20 AND transit >= 60                  |
| `wellness-retreat` | Wellness Retreat     | Gyms and greens            | parks >= 70 AND healthcare >= 70                       |

### Badge Priority

A location may match multiple badges. Display only the **first match** in this priority order (top = highest priority):

1. `perfect-spot`
2. `15min-hero`
3. `certified-chaos`
4. `off-grid`
5. `food-desert`
6. `car-required`
7. `night-owl`
8. `suburban-dream`
9. `workaholic-zone`
10. `wellness-retreat`

### Visual Design (Spec Only)

- Badge displayed as a pill/chip on the score panel
- Badge embedded in share cards (top-right corner or below score)
- Icon + short title (e.g., 🦉 Night Owl)
- Use badge-appropriate colors (chaos = red/orange, perfect = gold, etc.)

### Implementation Hint

Create a `lib/badges/` folder with:

- `definitions.ts` — badge objects with id, title, oneLiner, and condition function
- `evaluate.ts` — function that takes ScoreResult and returns Badge | null

---

## 6. P1: Versus Mode

### Concept

Compare two locations side-by-side and generate a "fight card" style share artifact.

### User Story

> As a user debating where to live/visit, I want to compare two spots and share the comparison to start a conversation with friends.

### UX Flow

1. User scores Location A (normal flow)
2. User clicks "Compare" button (new UI element)
3. App enters comparison mode — map shows "Select second location"
4. User clicks/searches Location B
5. App displays side-by-side comparison panel
6. User clicks "Share Comparison" to generate versus card

### Comparison Data

```typescript
interface VersusResult {
  locationA: {
    label: string; // Address or "Location A"
    coords: [number, number];
    score: ScoreResult;
  };
  locationB: {
    label: string;
    coords: [number, number];
    score: ScoreResult;
  };
  winner: 'A' | 'B' | 'tie';
  deltaOverall: number; // A.overall - B.overall
  categoryWins: {
    categoryId: string;
    winner: 'A' | 'B' | 'tie';
    delta: number;
  }[];
}
```

### Versus Copy Templates

| Scenario                   | Template                                             |
| -------------------------- | ---------------------------------------------------- |
| Blowout (delta >= 30)      | "{winner} wins by a landslide. It's not even close." |
| Clear winner (delta 10-29) | "{winner} takes it. {loser} put up a fight though."  |
| Close (delta 5-9)          | "Too close to call. Flip a coin?"                    |
| Tie (delta < 5)            | "Dead heat. They're basically twins."                |

### Share Card: Versus Layout

- Dimensions: 1200×630 (social) or 1080×1920 (story)
- Split-screen design: Location A on left, Location B on right
- Overall scores large and centered
- Category breakdown as small comparison bars
- Winner highlighted with subtle glow/crown
- QR code links to comparison view (future: shareable comparison URL)

### Implementation Hint

- New route: `/{locale}/compare/{latA},{lngA}/{latB},{lngB}` (noindex)
- New component: `VersusPanel.tsx`
- New share card variant: `ShareCardVersus.tsx`

---

## 7. P1: Share Card Upgrades

### Current State

Existing share cards (`ShareCardSocial.tsx`, etc.) display:

- Overall score (large number)
- Category grid (8 small cards with icons + scores)
- Location label
- QR code

### Upgrade 1: Radar Chart (Spider Chart)

Replace the category grid with a radar chart for a more "data visualization" aesthetic.

**Benefits:**

- Looks more sophisticated and shareable
- Shows category balance at a glance
- Fits the "infographic" trend on social media

**Spec:**

- 8 axes (one per category)
- Filled area shows actual scores
- Light reference circle at score=50
- Category labels around the perimeter

**Library suggestion:** Use a simple SVG-based radar chart (no heavy charting library needed).

### Upgrade 2: Percentile Context

Add a line below the score showing relative ranking:

> "More convenient than 73% of Berlin"

**Data requirement:**

- Precompute percentile distribution per city from heatmap data
- Store as city-level metadata: `{ p25: 42, p50: 58, p75: 71, p90: 82 }`
- Compare user's score to find percentile bucket

**Fallback:** If city percentiles unavailable, omit the line (don't guess).

### Upgrade 3: Theme Variants Based on Score

| Score Range | Theme Name | Visual Style                      |
| ----------- | ---------- | --------------------------------- |
| 90-100      | Elite      | Gold accents, subtle sparkle      |
| 70-89       | Strong     | Purple gradient (current)         |
| 40-69       | Standard   | Neutral/balanced palette          |
| 20-39       | Underdog   | Warm orange tones                 |
| 0-19        | Chaos      | Red/dark theme, "embrace it" vibe |

Badge (if present) should override theme to match badge personality.

### Upgrade 4: Badge Integration

- Display earned badge in top-right corner of share card
- Badge icon + short title
- Links visually to the vibe check copy at the bottom

---

## 8. Success Metrics

### Share Funnel

| Step                     | Metric            | Target (launch)        |
| ------------------------ | ----------------- | ---------------------- |
| Score viewed             | Baseline          | —                      |
| Share modal opened       | Open rate         | 15% of scored sessions |
| Image generated          | Generation rate   | 60% of modal opens     |
| Download/copy/share      | Action rate       | 80% of generations     |
| Inbound click from share | Viral coefficient | 0.3 clicks per share   |

### Retention

| Metric                       | Definition                 | Target |
| ---------------------------- | -------------------------- | ------ |
| D1 return                    | User returns within 24h    | 10%    |
| D7 return                    | User returns within 7 days | 5%     |
| Locations scored per session | Avg locations checked      | 2.5    |

### Quality Signals

| Metric                     | Definition                         | Action Threshold           |
| -------------------------- | ---------------------------------- | -------------------------- |
| Vibe copy skipped          | User closes panel before reading   | > 50% → review copy        |
| Badge screenshot rate      | Badge visible in downloaded images | Track for badge popularity |
| Negative feedback (future) | "Report this copy" clicks          | > 1% → review templates    |

---

## 9. Implementation Phases

### Phase 1: Foundation (P0)

1. Rename to "Convenience Score" across UI and share cards
2. Set up OpenAI integration (`OPENAI_API_KEY` env var)
3. Create `vibe_cache` Postgres table for AI response caching
4. Implement `/api/vibe` endpoint with:
   - OpenAI call with system/user prompts
   - Cache lookup/write
   - Fallback templates on error
5. Implement badge system (definitions + evaluation)
6. Integrate async vibe loading into score panel UI (skeleton → comment)
7. Integrate vibe + badge into existing share cards

### Phase 2: Enhancement (P1)

1. Add radar chart option to share cards
2. Compute and display percentiles (requires city-level aggregation)
3. Implement score-based theme variants
4. Build Versus Mode (comparison flow + versus share card)

### Phase 3: Iteration

1. Monitor OpenAI costs and cache hit rates
2. Add more badges based on user feedback
3. Test localized AI responses for top locales (de, es, fr)
4. Track and optimize share funnel metrics
5. Consider "regenerate" button for users who want a fresh comment

---

## 10. Open Questions (Decide During Implementation)

1. **Vibe copy placement:** Below the score? In a tooltip? On the share card only?
2. **Badge rarity:** Should we show "X% of locations get this badge"?
3. **Versus URL structure:** Should comparisons be shareable/bookmarkable?
4. **Regenerate button:** Should users be able to request a fresh AI comment? (cache bypass)
5. **AI model upgrade path:** Start with gpt-4o-mini, consider gpt-4o if quality needs improvement
6. **Radar vs grid:** Offer both as style options, or replace grid entirely?

---

## Related Documentation

- [Overview](OVERVIEW.md) — Product requirements and architecture
- [Setup](SETUP.md) — Development environment
- [Worker](WORKER.md) — Background job processing
