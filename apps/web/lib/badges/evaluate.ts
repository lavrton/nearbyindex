import type { ScoreResult } from "@/lib/score/types";
import { badgeDefinitions, type Badge } from "./definitions";

/**
 * Evaluate which badge a score result qualifies for.
 * Returns the highest priority badge that matches, or null if none match.
 *
 * Badges are checked in priority order (lowest priority number first).
 */
export function evaluateBadge(score: ScoreResult): Badge | null {
  // Sort by priority (already sorted in definitions, but ensure it)
  const sortedDefinitions = [...badgeDefinitions].sort(
    (a, b) => a.priority - b.priority
  );

  for (const definition of sortedDefinitions) {
    if (definition.condition(score)) {
      // Return badge without condition function
      const { condition, priority, ...badge } = definition;
      return badge;
    }
  }

  return null;
}

/**
 * Get all badges that a score qualifies for (for potential future use).
 */
export function evaluateAllBadges(score: ScoreResult): Badge[] {
  return badgeDefinitions
    .filter((definition) => definition.condition(score))
    .sort((a, b) => a.priority - b.priority)
    .map(({ condition, priority, ...badge }) => badge);
}
