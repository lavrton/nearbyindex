export interface Coordinates {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ScoreCategory {
  id: string;
  name: string;
  score: number;
  count: number;
  radius: number;
  nearestDistance: number | null;
}

export interface LocationScore {
  lat: number;
  lng: number;
  overall: number;
  categories: ScoreCategory[];
  computedAt: string;
}
