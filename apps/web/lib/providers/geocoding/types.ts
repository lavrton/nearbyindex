export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
  importance: number;
}

export interface GeocodingProvider {
  search(query: string): Promise<GeocodingResult[]>;
  reverse(lat: number, lng: number): Promise<GeocodingResult | null>;
}
