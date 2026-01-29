import { categories } from "./categories";
import type {
  ScoreResult,
  CategoryScoreResult,
  CategoryDefinition,
  SubType,
} from "./types";
import { getPOIProvider } from "@/lib/providers/poi";
import type { POI } from "@/lib/providers/poi/types";
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
    const score = calculateCategoryScore(category, pois, nearestDistance);

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
  pois: POI[],
  nearestDistance: number | null
): number {
  const count = pois.length;

  // No POIs = 0 score
  if (count === 0) return 0;

  // If category has sub-types, use diversity-aware scoring
  if (category.subTypes && category.subTypes.length > 0) {
    return calculateSubTypeScore(category, pois, nearestDistance);
  }

  // Standard scoring for categories without sub-types
  return calculateSimpleScore(
    count,
    category.maxCount,
    category.saturationK ?? 0.5,
    nearestDistance,
    category.radius,
    category.minCount
  );
}

/** Calculate score for categories with sub-types (e.g., healthcare) */
function calculateSubTypeScore(
  category: CategoryDefinition,
  pois: POI[],
  nearestDistance: number | null
): number {
  const subTypes = category.subTypes!;

  // Group POIs by sub-type
  const poiBySubType = new Map<string, POI[]>();
  for (const subType of subTypes) {
    poiBySubType.set(subType.id, []);
  }

  for (const poi of pois) {
    for (const subType of subTypes) {
      if (subType.tags.includes(poi.category)) {
        poiBySubType.get(subType.id)!.push(poi);
        break; // Each POI belongs to one sub-type
      }
    }
  }

  // Calculate score contribution from each sub-type
  // Each sub-type contributes proportionally to its maxCount relative to total
  const totalMaxCount = subTypes.reduce((sum, st) => sum + st.maxCount, 0);
  let countScore = 0;

  for (const subType of subTypes) {
    const subTypePois = poiBySubType.get(subType.id)!;
    const subTypeCount = subTypePois.length;

    if (subTypeCount === 0) continue;

    // Weight of this sub-type in the overall score (based on maxCount proportion)
    const subTypeWeight = subType.maxCount / totalMaxCount;

    // Logarithmic score for this sub-type
    const k = subType.saturationK;
    const logMax = Math.log(1 + subType.maxCount * k);
    const subTypeScore = Math.log(1 + subTypeCount * k) / logMax;

    countScore += 60 * subTypeWeight * subTypeScore;
  }

  // Diversity bonus (0-15 points)
  // Rewards having multiple different sub-types present
  const presentSubTypes = subTypes.filter(
    (st) => poiBySubType.get(st.id)!.length > 0
  ).length;
  const diversityBonus =
    presentSubTypes > 1 ? Math.min(15, (presentSubTypes - 1) * 5) : 0;

  // Distance score (0-25 points)
  let distanceScore = 0;
  if (nearestDistance !== null) {
    const closeThreshold = Math.min(400, category.radius * 0.4);
    distanceScore = 25 * Math.max(0, 1 - nearestDistance / closeThreshold);
  }

  // Penalty if minimum count not met
  if (pois.length < category.minCount) {
    return Math.round((countScore + distanceScore) * 0.4);
  }

  return Math.min(100, Math.round(countScore + distanceScore + diversityBonus));
}

/** Standard scoring without sub-types */
function calculateSimpleScore(
  count: number,
  maxCount: number,
  saturationK: number,
  nearestDistance: number | null,
  radius: number,
  minCount: number
): number {
  // Logarithmic count score (0-60 points)
  const k = saturationK;
  const logMax = Math.log(1 + maxCount * k);
  const countScore = (60 * Math.log(1 + count * k)) / logMax;

  // Distance score (0-25 points)
  let distanceScore = 0;
  if (nearestDistance !== null) {
    const closeThreshold = Math.min(400, radius * 0.4);
    distanceScore = 25 * Math.max(0, 1 - nearestDistance / closeThreshold);
  }

  // Density bonus (0-15 points)
  let densityBonus = 0;
  if (count > maxCount) {
    const excess = count - maxCount;
    densityBonus =
      15 * Math.min(1, Math.log(1 + excess) / Math.log(1 + maxCount * 2));
  }

  // Penalty if minimum count not met
  if (count < minCount) {
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

  return calculateCategoryScore(groceryCategory, pois, nearestDistance);
}
