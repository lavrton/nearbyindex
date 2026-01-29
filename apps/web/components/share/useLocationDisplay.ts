export interface ParsedLocation {
  primary: string; // e.g., "Mitte"
  secondary: string; // e.g., "Berlin, Germany"
}

/**
 * Format coordinates in a fun, readable way.
 */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`;
}

/**
 * Parse an address string into primary (neighborhood) and secondary (city, country) parts.
 * This provides a user-friendly display instead of showing raw lat/lng coordinates.
 */
export function parseLocationDisplay(address?: string, lat?: number, lng?: number): ParsedLocation {
  if (!address) {
    // Show coordinates in a fun way if available
    if (lat !== undefined && lng !== undefined) {
      return {
        primary: "Somewhere interesting",
        secondary: formatCoordinates(lat, lng)
      };
    }
    return { primary: "Somewhere interesting", secondary: "" };
  }

  const parts = address.split(", ").map((p) => p.trim());

  if (parts.length >= 3) {
    return {
      primary: parts[0],
      secondary: parts.slice(1, 3).join(", "),
    };
  } else if (parts.length === 2) {
    return { primary: parts[0], secondary: parts[1] };
  }

  return { primary: address, secondary: "" };
}
