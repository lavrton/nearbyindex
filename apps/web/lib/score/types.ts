export interface POIResult {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  distance: number;
}

export interface CategoryScoreResult {
  id: string;
  score: number;
  count: number;
  radius: number;
  nearestDistance: number | null;
  pois: POIResult[];
}

export interface ScoreResult {
  lat: number;
  lng: number;
  overall: number;
  categories: CategoryScoreResult[];
  computedAt: string;
}

/** Sub-type within a category for diversity-aware scoring */
export interface SubType {
  id: string;
  tags: string[]; // OSM tags belonging to this sub-type
  maxCount: number; // Saturation point for this sub-type
  saturationK: number; // Curve steepness for this sub-type
}

export interface CategoryDefinition {
  id: string;
  weight: number;
  radius: number;
  minCount: number;
  maxCount: number;
  overpassTags: string[];
  /** Controls saturation curve steepness. Higher k = faster saturation (first POI matters most).
   * Default: 0.5. Examples: pharmacy=3.0 (1-2 enough), restaurants=0.3 (variety adds value) */
  saturationK?: number;
  /** Sub-types for diversity-aware scoring. When present, score is calculated per sub-type
   * with a diversity bonus for having multiple types (e.g., pharmacy + clinic > just pharmacies) */
  subTypes?: SubType[];
}
