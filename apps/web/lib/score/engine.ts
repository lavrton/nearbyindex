import { categories } from "./categories";
import type {
  ScoreResult,
  CategoryScoreResult,
  CategoryDefinition,
} from "./types";
import { getPOIProvider } from "@/lib/providers/poi";
export async function calculateScore(
  lat: number,
  lng: number
): Promise<ScoreResult> {
  const poiProvider = getPOIProvider();
  const categoryResults: CategoryScoreResult[] = [];

  // Fetch POIs for each category in parallel
  const categoryPOIPromises = categories.map(async (category) => {
    const pois = await poiProvider.queryPOIs({
      lat,
      lng,
      radius: category.radius,
      tags: category.overpassTags,
    });

    const nearestDistance =
      pois.length > 0
        ? Math.min(...pois.map((p) => p.distance ?? Infinity))
        : null;

    return { category, pois, nearestDistance };
  });

  const results = await Promise.all(categoryPOIPromises);

  // Calculate scores for each category
  for (const { category, pois, nearestDistance } of results) {
    const score = calculateCategoryScore(
      category,
      pois.length,
      nearestDistance
    );

    // Sort POIs by distance and limit to 20 closest
    const sortedPois = pois
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .slice(0, 20)
      .map((poi) => ({
        id: poi.id,
        lat: poi.lat,
        lng: poi.lng,
        name: poi.name,
        distance: Math.round(poi.distance ?? 0),
      }));

    categoryResults.push({
      id: category.id,
      score: Math.round(score),
      count: pois.length,
      radius: category.radius,
      nearestDistance,
      pois: sortedPois,
    });
  }

  // Calculate overall score (weighted average)
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = categoryResults.reduce((sum, result) => {
    const category = categories.find((c) => c.id === result.id)!;
    return sum + result.score * category.weight;
  }, 0);

  const overall = Math.round(weightedSum / totalWeight);

  return {
    lat,
    lng,
    overall,
    categories: categoryResults,
    computedAt: new Date().toISOString(),
  };
}

function calculateCategoryScore(
  category: CategoryDefinition,
  count: number,
  nearestDistance: number | null
): number {
  // No POIs = 0 score
  if (count === 0) return 0;

  // Logarithmic count score (0-60 points)
  // Diminishing returns: first few POIs matter most, then tapers off
  // Formula: 60 * log(1 + count * k) / log(1 + maxCount * k)
  // k controls curve steepness (higher = more diminishing)
  const k = 0.5;
  const logMax = Math.log(1 + category.maxCount * k);
  const countScore = 60 * Math.log(1 + count * k) / logMax;

  // Distance score (0-25 points)
  // Rewards having POIs VERY close (within 200m for full bonus)
  let distanceScore = 0;
  if (nearestDistance !== null) {
    // Full points at 0m, drops to 0 at 400m (stricter than before)
    const closeThreshold = Math.min(400, category.radius * 0.4);
    distanceScore = 25 * Math.max(0, 1 - nearestDistance / closeThreshold);
  }

  // Density bonus (0-15 points)
  // Rewards having MANY options, not just meeting minimum
  // Only kicks in after exceeding maxCount (truly exceptional density)
  let densityBonus = 0;
  if (count > category.maxCount) {
    // Logarithmic bonus for exceeding expectations
    const excess = count - category.maxCount;
    densityBonus = 15 * Math.min(1, Math.log(1 + excess) / Math.log(1 + category.maxCount * 2));
  }

  // Penalty if minimum count not met
  if (count < category.minCount) {
    return Math.round((countScore + distanceScore) * 0.4);
  }

  return Math.min(100, Math.round(countScore + distanceScore + densityBonus));
}

// Simplified score calculation for heatmap (groceries only)
export async function calculateGroceryScore(
  lat: number,
  lng: number
): Promise<number> {
  const poiProvider = getPOIProvider();
  const groceryCategory = categories.find((c) => c.id === "groceries")!;

  const pois = await poiProvider.queryPOIs({
    lat,
    lng,
    radius: groceryCategory.radius,
    tags: groceryCategory.overpassTags,
  });

  const nearestDistance =
    pois.length > 0
      ? Math.min(...pois.map((p) => p.distance ?? Infinity))
      : null;

  return calculateCategoryScore(groceryCategory, pois.length, nearestDistance);
}
