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

export interface CategoryDefinition {
  id: string;
  weight: number;
  radius: number;
  minCount: number;
  maxCount: number;
  overpassTags: string[];
}
