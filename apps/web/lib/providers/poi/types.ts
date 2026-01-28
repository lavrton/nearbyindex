export interface POI {
  id: string;
  lat: number;
  lng: number;
  name: string | null;
  category: string;
  tags: Record<string, string>;
  distance?: number;
}

export interface POIQueryOptions {
  lat: number;
  lng: number;
  radius: number;
  tags: string[];
}

export interface POIProvider {
  queryPOIs(options: POIQueryOptions): Promise<POI[]>;
}
