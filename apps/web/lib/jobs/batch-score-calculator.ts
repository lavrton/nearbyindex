/**
 * Batch score calculator for heatmap processing
 *
 * Optimized for processing many cells by loading all POIs into memory once,
 * then calculating scores without database queries.
 *
 * This is ~100x faster than individual queries for remote databases.
 */

import { getDb } from "@/lib/db/client";
import { overturePois } from "@/lib/db/schema";
import { and, gte, lte, inArray } from "drizzle-orm";
import { categories, getCategoryById } from "@/lib/score/categories";
import {
  categoryIdsToOvertureCategories,
  overtureCategoryToCategoryId,
} from "@/lib/providers/poi/category-map";

interface POI {
  lat: number;
  lng: number;
  category: string; // overture category
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface BatchCalculator {
  calculateScore: (lat: number, lng: number) => number;
  poiCount: number;
}

// Default categories for heatmap: groceries, restaurants, parks
const DEFAULT_HEATMAP_CATEGORIES = ["groceries", "restaurants", "parks"];

/**
 * Create a batch calculator that pre-loads all POIs for a region
 *
 * @param bounds - The region to process
 * @param categoryIds - Which categories to include (default: groceries, restaurants, parks)
 * @param buffer - Extra buffer in meters around bounds (default: 1500m for largest radius)
 */
export async function createBatchCalculator(
  bounds: Bounds,
  categoryIds: string[] = DEFAULT_HEATMAP_CATEGORIES,
  buffer: number = 1500
): Promise<BatchCalculator> {
  const db = getDb();

  // Get category configs
  const selectedCategories = categoryIds
    .map((id) => getCategoryById(id))
    .filter((c) => c !== undefined);

  if (selectedCategories.length === 0) {
    throw new Error(`No valid categories found for IDs: ${categoryIds.join(", ")}`);
  }

  // Use largest radius for buffer
  const maxRadius = Math.max(...selectedCategories.map((c) => c.radius));

  // Convert buffer to degrees (approximate)
  const latBuffer = Math.max(buffer, maxRadius) / 111320;
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const lngBuffer = Math.max(buffer, maxRadius) / (111320 * Math.cos((midLat * Math.PI) / 180));

  // Expanded bounds to include POIs that could affect edge cells
  const expandedBounds = {
    minLat: bounds.minLat - latBuffer,
    maxLat: bounds.maxLat + latBuffer,
    minLng: bounds.minLng - lngBuffer,
    maxLng: bounds.maxLng + lngBuffer,
  };

  // Get all Overture categories for selected category IDs
  const overtureCategories = categoryIdsToOvertureCategories(categoryIds);

  console.log(
    `Loading POIs for region: ${expandedBounds.minLat.toFixed(4)},${expandedBounds.minLng.toFixed(4)} to ${expandedBounds.maxLat.toFixed(4)},${expandedBounds.maxLng.toFixed(4)}`
  );
  console.log(`Categories: ${categoryIds.join(", ")}`);
  console.log(`Overture categories: ${overtureCategories.length} types`);

  // Load ALL POIs for selected categories in ONE query
  const pois = await db
    .select({
      lat: overturePois.lat,
      lng: overturePois.lng,
      category: overturePois.category,
    })
    .from(overturePois)
    .where(
      and(
        gte(overturePois.lat, expandedBounds.minLat),
        lte(overturePois.lat, expandedBounds.maxLat),
        gte(overturePois.lng, expandedBounds.minLng),
        lte(overturePois.lng, expandedBounds.maxLng),
        inArray(overturePois.category, overtureCategories)
      )
    );

  console.log(`Loaded ${pois.length} POIs into memory`);

  // Group POIs by our category ID
  const poisByCategory = new Map<string, POI[]>();
  for (const categoryId of categoryIds) {
    poisByCategory.set(categoryId, []);
  }

  for (const poi of pois) {
    const categoryId = overtureCategoryToCategoryId(poi.category);
    if (categoryId && poisByCategory.has(categoryId)) {
      poisByCategory.get(categoryId)!.push(poi);
    }
  }

  for (const [catId, catPois] of poisByCategory) {
    console.log(`  ${catId}: ${catPois.length} POIs`);
  }

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Compress raw scores to 0-100 using exponential curve for values above 60.
  // Must match engine.ts compressScore() function!
  const compressScore = (rawScore: number): number => {
    if (rawScore <= 60) return rawScore;
    const compressed = 60 + 40 * (1 - Math.exp(-(rawScore - 60) / 50));
    return Math.min(100, Math.round(compressed));
  };

  // Calculate score for a single category at a point
  const calculateCategoryScore = (
    lat: number,
    lng: number,
    categoryId: string
  ): number => {
    const categoryConfig = getCategoryById(categoryId);
    if (!categoryConfig) return 0;

    const categoryPois = poisByCategory.get(categoryId) || [];
    const radius = categoryConfig.radius;
    const minCount = categoryConfig.minCount;
    const maxCount = categoryConfig.maxCount;
    const k = categoryConfig.saturationK ?? 0.5;
    const logMax = Math.log(1 + maxCount * k);

    // Convert radius to approximate degrees for quick filtering
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));

    // Quick bounding box filter first (much faster than distance calc)
    const nearby = categoryPois.filter(
      (poi) =>
        poi.lat >= lat - latDelta &&
        poi.lat <= lat + latDelta &&
        poi.lng >= lng - lngDelta &&
        poi.lng <= lng + lngDelta
    );

    // Calculate actual distances for nearby POIs
    const distances = nearby.map((poi) => calculateDistance(lat, lng, poi.lat, poi.lng));
    const withinRadius = distances.filter((d) => d <= radius);

    const count = withinRadius.length;
    if (count === 0) return 0;

    const nearestDistance = Math.min(...withinRadius);

    // Count score (0-60 points)
    const countScore = (60 * Math.log(1 + count * k)) / logMax;

    // Distance score (0-25 points)
    const closeThreshold = Math.min(400, radius * 0.4);
    const distanceScore = 25 * Math.max(0, 1 - nearestDistance / closeThreshold);

    // Density bonus (0-15 points)
    let densityBonus = 0;
    if (count > maxCount) {
      const excess = count - maxCount;
      densityBonus = 15 * Math.min(1, Math.log(1 + excess) / Math.log(1 + maxCount * 2));
    }

    // Penalty if minimum not met
    if (count < minCount) {
      return Math.round((countScore + distanceScore) * 0.4);
    }

    const rawScore = countScore + distanceScore + densityBonus;
    // Don't compress or cap here - let raw scores flow through to weighted average
    // Only compress once at the final step (line 224)
    return rawScore;
  };

  // Calculate total weight for selected categories
  const totalWeight = selectedCategories.reduce((sum, c) => sum + c.weight, 0);

  // Return calculator function that uses in-memory POIs
  return {
    poiCount: pois.length,
    calculateScore: (lat: number, lng: number): number => {
      // Calculate score for each category
      let weightedSum = 0;

      for (const category of selectedCategories) {
        const score = calculateCategoryScore(lat, lng, category.id);
        weightedSum += score * category.weight;
      }

      // Weighted average, then compress overall score
      const avgScore = weightedSum / totalWeight;
      return compressScore(Math.round(avgScore));
    },
  };
}
