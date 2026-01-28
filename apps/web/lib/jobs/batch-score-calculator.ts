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
import { categories } from "@/lib/score/categories";
import { osmTagsToOvertureCategories } from "@/lib/providers/poi/category-map";

interface POI {
  lat: number;
  lng: number;
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

/**
 * Create a batch calculator that pre-loads all POIs for a region
 *
 * @param bounds - The region to process
 * @param buffer - Extra buffer in meters around bounds (default: 1000m for grocery radius)
 */
export async function createBatchCalculator(
  bounds: Bounds,
  buffer: number = 1000
): Promise<BatchCalculator> {
  const db = getDb();

  // Get grocery category config
  const groceryCategory = categories.find((c) => c.id === "groceries")!;
  const radius = groceryCategory.radius;

  // Convert buffer to degrees (approximate)
  const latBuffer = buffer / 111320;
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const lngBuffer = buffer / (111320 * Math.cos((midLat * Math.PI) / 180));

  // Expanded bounds to include POIs that could affect edge cells
  const expandedBounds = {
    minLat: bounds.minLat - latBuffer,
    maxLat: bounds.maxLat + latBuffer,
    minLng: bounds.minLng - lngBuffer,
    maxLng: bounds.maxLng + lngBuffer,
  };

  // Map OSM tags to Overture categories
  const overtureCategories = osmTagsToOvertureCategories(groceryCategory.overpassTags);

  console.log(`Loading POIs for region: ${expandedBounds.minLat.toFixed(4)},${expandedBounds.minLng.toFixed(4)} to ${expandedBounds.maxLat.toFixed(4)},${expandedBounds.maxLng.toFixed(4)}`);
  console.log(`Categories: ${overtureCategories.join(", ")}`);

  // Load ALL grocery POIs for the expanded region in one query
  const pois = await db
    .select({
      lat: overturePois.lat,
      lng: overturePois.lng,
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

  // Pre-compute constants for scoring
  const minCount = groceryCategory.minCount;
  const maxCount = groceryCategory.maxCount;
  const k = 0.5;
  const logMax = Math.log(1 + maxCount * k);

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

  // Score calculation (same logic as engine.ts)
  const calculateCategoryScore = (count: number, nearestDistance: number | null): number => {
    if (count === 0) return 0;

    // Count score (0-60 points)
    const countScore = 60 * Math.log(1 + count * k) / logMax;

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
      densityBonus = 15 * Math.min(1, Math.log(1 + excess) / Math.log(1 + maxCount * 2));
    }

    // Penalty if minimum not met
    if (count < minCount) {
      return Math.round((countScore + distanceScore) * 0.4);
    }

    return Math.min(100, Math.round(countScore + distanceScore + densityBonus));
  };

  // Return calculator function that uses in-memory POIs
  return {
    poiCount: pois.length,
    calculateScore: (lat: number, lng: number): number => {
      // Convert radius to approximate degrees for quick filtering
      const latDelta = radius / 111320;
      const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));

      // Quick bounding box filter first (much faster than distance calc)
      const nearby = pois.filter(
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
      const nearestDistance = withinRadius.length > 0 ? Math.min(...withinRadius) : null;

      return calculateCategoryScore(count, nearestDistance);
    },
  };
}
