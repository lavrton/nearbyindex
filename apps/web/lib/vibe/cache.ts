import { db } from "@/lib/db/client";
import { vibeCache } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { VibeRequest } from "./types";

const MAX_VARIATIONS = 3;

/**
 * Generate a cache key from score data.
 * Format: vibe:{overall}:{groceries}:{restaurants}:{transit}:{healthcare}:{education}:{parks}:{shopping}:{entertainment}:{locale}
 */
export function generateCacheKey(request: VibeRequest): string {
  const categoryOrder = [
    "groceries",
    "restaurants",
    "transit",
    "healthcare",
    "education",
    "parks",
    "shopping",
    "entertainment",
  ];

  const categoryScores = categoryOrder.map((id) => {
    const category = request.categories.find((c) => c.id === id);
    return category?.score ?? 0;
  });

  return `vibe:${request.overall}:${categoryScores.join(":")}:${request.locale || "en"}`;
}

/**
 * Get all cached variations for a cache key
 */
export async function getCachedVibes(
  cacheKey: string
): Promise<Array<{ comment: string; variationIndex: number }>> {
  try {
    const results = await db
      .select({
        comment: vibeCache.comment,
        variationIndex: vibeCache.variationIndex,
      })
      .from(vibeCache)
      .where(eq(vibeCache.cacheKey, cacheKey));

    return results;
  } catch (error) {
    console.error("Cache read error:", error);
    return [];
  }
}

/**
 * Get the count of cached variations for a cache key
 */
export async function getVariationCount(cacheKey: string): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(vibeCache)
      .where(eq(vibeCache.cacheKey, cacheKey));

    return Number(result[0]?.count ?? 0);
  } catch (error) {
    console.error("Cache count error:", error);
    return 0;
  }
}

/**
 * Get a random cached vibe if all 3 variations exist.
 * Returns null if fewer than 3 variations exist (caller should generate new one).
 */
export async function getRandomCachedVibe(
  cacheKey: string
): Promise<string | null> {
  try {
    const variations = await getCachedVibes(cacheKey);

    if (variations.length >= MAX_VARIATIONS) {
      // Pick a random variation
      const randomIndex = Math.floor(Math.random() * variations.length);
      const selected = variations[randomIndex];

      // Increment hit count (non-blocking)
      db.update(vibeCache)
        .set({ hitCount: sql`${vibeCache.hitCount} + 1` })
        .where(eq(vibeCache.cacheKey, cacheKey))
        .catch(() => {});

      return selected.comment;
    }

    return null;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

/**
 * Store a new vibe variation in cache.
 * Finds the next available variation index (0, 1, or 2).
 * Does nothing if all 3 slots are taken.
 */
export async function setCachedVibe(
  cacheKey: string,
  comment: string
): Promise<void> {
  try {
    const variations = await getCachedVibes(cacheKey);

    if (variations.length >= MAX_VARIATIONS) {
      // All slots taken, don't insert
      return;
    }

    // Find the next available variation index
    const usedIndexes = new Set(variations.map((v) => v.variationIndex));
    let nextIndex = 0;
    for (let i = 0; i < MAX_VARIATIONS; i++) {
      if (!usedIndexes.has(i)) {
        nextIndex = i;
        break;
      }
    }

    await db
      .insert(vibeCache)
      .values({
        cacheKey,
        variationIndex: nextIndex,
        comment,
        hitCount: 0,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

/**
 * Get cached vibe comment (legacy function for backwards compatibility)
 * @deprecated Use getRandomCachedVibe instead
 */
export async function getCachedVibe(
  cacheKey: string
): Promise<string | null> {
  return getRandomCachedVibe(cacheKey);
}
