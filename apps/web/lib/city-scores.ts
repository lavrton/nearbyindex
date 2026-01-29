import { categories } from "./score/categories";

export interface CategoryStats {
  id: string;
  score: number;
}

export interface CityStats {
  slug: string;
  name: string;
  overallScore: number;
  categories: CategoryStats[];
  sampleCount: number;
  computedAt: string;
}

// City definitions with coordinates (should match city page data)
export const CITIES: Record<
  string,
  { name: string; lat: number; lng: number; country: string }
> = {
  berlin: { name: "Berlin", lat: 52.52, lng: 13.405, country: "DE" },
  munich: { name: "Munich", lat: 48.1351, lng: 11.582, country: "DE" },
  hamburg: { name: "Hamburg", lat: 53.5511, lng: 9.9937, country: "DE" },
  frankfurt: { name: "Frankfurt", lat: 50.1109, lng: 8.6821, country: "DE" },
  cologne: { name: "Cologne", lat: 50.9375, lng: 6.9603, country: "DE" },
  vienna: { name: "Vienna", lat: 48.2082, lng: 16.3738, country: "AT" },
  zurich: { name: "Zurich", lat: 47.3769, lng: 8.5417, country: "CH" },
  amsterdam: { name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "NL" },
  paris: { name: "Paris", lat: 48.8566, lng: 2.3522, country: "FR" },
  london: { name: "London", lat: 51.5074, lng: -0.1278, country: "GB" },
};

// Pre-computed city stats (in production, this would come from database)
// These are representative sample scores for demonstration
const CITY_STATS_CACHE: Record<string, CityStats> = {
  berlin: {
    slug: "berlin",
    name: "Berlin",
    overallScore: 74,
    categories: [
      { id: "groceries", score: 78 },
      { id: "restaurants", score: 82 },
      { id: "transit", score: 71 },
      { id: "healthcare", score: 68 },
      { id: "education", score: 72 },
      { id: "parks", score: 75 },
      { id: "shopping", score: 70 },
      { id: "entertainment", score: 76 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  munich: {
    slug: "munich",
    name: "Munich",
    overallScore: 76,
    categories: [
      { id: "groceries", score: 80 },
      { id: "restaurants", score: 79 },
      { id: "transit", score: 75 },
      { id: "healthcare", score: 72 },
      { id: "education", score: 74 },
      { id: "parks", score: 78 },
      { id: "shopping", score: 73 },
      { id: "entertainment", score: 71 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  hamburg: {
    slug: "hamburg",
    name: "Hamburg",
    overallScore: 72,
    categories: [
      { id: "groceries", score: 75 },
      { id: "restaurants", score: 77 },
      { id: "transit", score: 70 },
      { id: "healthcare", score: 66 },
      { id: "education", score: 69 },
      { id: "parks", score: 74 },
      { id: "shopping", score: 68 },
      { id: "entertainment", score: 73 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  frankfurt: {
    slug: "frankfurt",
    name: "Frankfurt",
    overallScore: 73,
    categories: [
      { id: "groceries", score: 76 },
      { id: "restaurants", score: 78 },
      { id: "transit", score: 74 },
      { id: "healthcare", score: 70 },
      { id: "education", score: 68 },
      { id: "parks", score: 71 },
      { id: "shopping", score: 75 },
      { id: "entertainment", score: 72 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  cologne: {
    slug: "cologne",
    name: "Cologne",
    overallScore: 71,
    categories: [
      { id: "groceries", score: 74 },
      { id: "restaurants", score: 76 },
      { id: "transit", score: 69 },
      { id: "healthcare", score: 67 },
      { id: "education", score: 70 },
      { id: "parks", score: 72 },
      { id: "shopping", score: 68 },
      { id: "entertainment", score: 70 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  vienna: {
    slug: "vienna",
    name: "Vienna",
    overallScore: 79,
    categories: [
      { id: "groceries", score: 82 },
      { id: "restaurants", score: 84 },
      { id: "transit", score: 80 },
      { id: "healthcare", score: 76 },
      { id: "education", score: 78 },
      { id: "parks", score: 81 },
      { id: "shopping", score: 74 },
      { id: "entertainment", score: 79 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  zurich: {
    slug: "zurich",
    name: "Zurich",
    overallScore: 77,
    categories: [
      { id: "groceries", score: 79 },
      { id: "restaurants", score: 76 },
      { id: "transit", score: 82 },
      { id: "healthcare", score: 78 },
      { id: "education", score: 80 },
      { id: "parks", score: 77 },
      { id: "shopping", score: 71 },
      { id: "entertainment", score: 73 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  amsterdam: {
    slug: "amsterdam",
    name: "Amsterdam",
    overallScore: 78,
    categories: [
      { id: "groceries", score: 80 },
      { id: "restaurants", score: 83 },
      { id: "transit", score: 79 },
      { id: "healthcare", score: 74 },
      { id: "education", score: 76 },
      { id: "parks", score: 80 },
      { id: "shopping", score: 75 },
      { id: "entertainment", score: 81 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  paris: {
    slug: "paris",
    name: "Paris",
    overallScore: 80,
    categories: [
      { id: "groceries", score: 83 },
      { id: "restaurants", score: 88 },
      { id: "transit", score: 84 },
      { id: "healthcare", score: 75 },
      { id: "education", score: 79 },
      { id: "parks", score: 76 },
      { id: "shopping", score: 82 },
      { id: "entertainment", score: 85 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
  london: {
    slug: "london",
    name: "London",
    overallScore: 77,
    categories: [
      { id: "groceries", score: 79 },
      { id: "restaurants", score: 84 },
      { id: "transit", score: 81 },
      { id: "healthcare", score: 71 },
      { id: "education", score: 76 },
      { id: "parks", score: 78 },
      { id: "shopping", score: 80 },
      { id: "entertainment", score: 82 },
    ],
    sampleCount: 50,
    computedAt: "2025-01-01T00:00:00Z",
  },
};

/**
 * Get pre-computed stats for a city
 * Returns null if city not found
 */
export function getCityStats(citySlug: string): CityStats | null {
  const normalized = citySlug.toLowerCase();
  return CITY_STATS_CACHE[normalized] ?? null;
}

/**
 * Get city info by slug
 */
export function getCityInfo(
  citySlug: string
): { name: string; lat: number; lng: number; country: string } | null {
  const normalized = citySlug.toLowerCase();
  return CITIES[normalized] ?? null;
}

/**
 * Get all available cities with their stats
 */
export function getAllCityStats(): CityStats[] {
  return Object.values(CITY_STATS_CACHE);
}

/**
 * Get category definition by ID
 */
export function getCategoryWeight(categoryId: string): number {
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.weight ?? 1.0;
}
