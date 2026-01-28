import type { Coordinates, BoundingBox } from "../types";

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Round coordinates to specified precision (for cache keys)
 * Default precision of 4 decimal places = ~11m accuracy
 */
export function roundCoordinates(
  coords: Coordinates,
  precision = 4
): Coordinates {
  const multiplier = Math.pow(10, precision);
  return {
    lat: Math.round(coords.lat * multiplier) / multiplier,
    lng: Math.round(coords.lng * multiplier) / multiplier,
  };
}

/**
 * Check if coordinates are within a bounding box
 */
export function isWithinBounds(
  coords: Coordinates,
  bounds: BoundingBox
): boolean {
  return (
    coords.lat >= bounds.minLat &&
    coords.lat <= bounds.maxLat &&
    coords.lng >= bounds.minLng &&
    coords.lng <= bounds.maxLng
  );
}

/**
 * Generate a grid of points within a bounding box
 */
export function generateGrid(
  bounds: BoundingBox,
  stepMeters: number
): Coordinates[] {
  const points: Coordinates[] = [];

  // Convert meters to approximate degrees
  // At equator: 1 degree latitude = ~111km, 1 degree longitude = ~111km
  // Adjust for latitude
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latStep = stepMeters / 111000;
  const lngStep = stepMeters / (111000 * Math.cos(toRad(centerLat)));

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
      points.push({ lat, lng });
    }
  }

  return points;
}

/**
 * Create a URL-safe coordinate string
 */
export function coordsToString(coords: Coordinates): string {
  return `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
}

/**
 * Parse a coordinate string back to Coordinates
 */
export function stringToCoords(str: string): Coordinates | null {
  const [lat, lng] = str.split(",").map(parseFloat);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}
