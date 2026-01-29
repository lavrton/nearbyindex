import { getDb } from "@/lib/db/client";
import { overturePois } from "@/lib/db/schema";
import { and, gte, lte, inArray, sql } from "drizzle-orm";
import type { POIProvider, POI, POIQueryOptions } from "./types";
import {
  osmTagsToOvertureCategories,
  overtureCategoryToOsmTag,
} from "./category-map";

export class LocalDBProvider implements POIProvider {
  async queryPOIs(options: POIQueryOptions): Promise<POI[]> {
    const { lat, lng, radius, tags } = options;
    const db = getDb();

    // Convert radius (meters) to approximate degrees
    const latDelta = radius / 111320;
    const lngDelta = radius / (111320 * Math.cos((lat * Math.PI) / 180));

    // Map OSM tags to Overture categories
    const categories = osmTagsToOvertureCategories(tags);

    if (categories.length === 0) {
      // No matching categories found, return empty
      return [];
    }

    const results = await db
      .select()
      .from(overturePois)
      .where(
        and(
          gte(overturePois.lat, lat - latDelta),
          lte(overturePois.lat, lat + latDelta),
          gte(overturePois.lng, lng - lngDelta),
          lte(overturePois.lng, lng + lngDelta),
          inArray(overturePois.category, categories)
        )
      )
      .limit(100);

    return results.map((row) => ({
      id: row.id,
      lat: row.lat,
      lng: row.lng,
      name: row.name,
      // Map Overture category back to matching OSM tag for sub-type detection
      category: overtureCategoryToOsmTag(row.category, tags) || row.category,
      tags: (row.tags as Record<string, string>) || {},
      distance: this.calculateDistance(lat, lng, row.lat, row.lng),
    }));
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
