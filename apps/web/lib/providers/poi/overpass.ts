import type { POIProvider, POI, POIQueryOptions } from "./types";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// Available Overpass API servers for rotation
const OVERPASS_SERVERS = [
  { url: "https://overpass-api.de/api/interpreter", name: "DE-Main" },
  { url: "https://overpass.kumi.systems/api/interpreter", name: "Kumi" },
  { url: "https://overpass.openstreetmap.fr/api/interpreter", name: "France" },
  { url: "https://maps.mail.ru/osm/tools/overpass/api/interpreter", name: "Mail.ru" },
];

// Server health tracking
interface ServerState {
  url: string;
  name: string;
  cooldownUntil: number; // timestamp when server becomes available again
  failCount: number;
  lastSuccess: number;
}

const serverStates: Map<string, ServerState> = new Map(
  OVERPASS_SERVERS.map((s) => [
    s.url,
    { url: s.url, name: s.name, cooldownUntil: 0, failCount: 0, lastSuccess: Date.now() },
  ])
);

// Cooldown duration after rate limit (starts at 10s, increases with failures)
const BASE_COOLDOWN_MS = 10000;
const MAX_COOLDOWN_MS = 60000; // 1 minute max

// Get next available server (round-robin with health check)
let serverIndex = 0;
function getNextServer(): ServerState | null {
  const now = Date.now();
  const servers = Array.from(serverStates.values());

  // Try each server starting from current index
  for (let i = 0; i < servers.length; i++) {
    const idx = (serverIndex + i) % servers.length;
    const server = servers[idx];

    if (server.cooldownUntil <= now) {
      serverIndex = (idx + 1) % servers.length;
      return server;
    }
  }

  // All servers on cooldown - return the one with shortest remaining cooldown
  const sortedByAvailability = servers.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  return sortedByAvailability[0];
}

function markServerFailed(url: string, status: number): void {
  const state = serverStates.get(url);
  if (!state) return;

  state.failCount++;
  const cooldown = Math.min(BASE_COOLDOWN_MS * Math.pow(2, state.failCount - 1), MAX_COOLDOWN_MS);
  state.cooldownUntil = Date.now() + cooldown;

  const cooldownSecs = Math.round(cooldown / 1000);
  console.log(`[${state.name}] marked unavailable for ${cooldownSecs}s (status: ${status}, fails: ${state.failCount})`);
}

function markServerSuccess(url: string): void {
  const state = serverStates.get(url);
  if (!state) return;

  state.failCount = 0;
  state.cooldownUntil = 0;
  state.lastSuccess = Date.now();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OverpassProvider implements POIProvider {
  async queryPOIs(options: POIQueryOptions): Promise<POI[]> {
    const { lat, lng, radius, tags } = options;

    // Build Overpass query
    const tagQueries = tags
      .map((tag) => {
        const [key, value] = tag.split("=");
        return `node["${key}"="${value}"](around:${radius},${lat},${lng});
way["${key}"="${value}"](around:${radius},${lat},${lng});`;
      })
      .join("\n");

    const query = `
[out:json][timeout:25];
(
${tagQueries}
);
out center;
`;

    // Try servers with rotation and failover
    const maxAttempts = OVERPASS_SERVERS.length * 2; // Try each server up to twice
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const server = getNextServer();
      if (!server) {
        throw new Error("No Overpass servers available");
      }

      // If server is on cooldown, wait a bit
      const now = Date.now();
      if (server.cooldownUntil > now) {
        const waitTime = Math.min(server.cooldownUntil - now, 5000);
        await sleep(waitTime);
      }

      try {
        const response = await fetch(server.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        if (response.status === 429 || response.status >= 500) {
          markServerFailed(server.url, response.status);
          lastError = new Error(`${server.name}: ${response.status} ${response.statusText}`);
          continue; // Try next server
        }

        if (!response.ok) {
          throw new Error(`Overpass query failed: ${response.statusText}`);
        }

        // Success!
        markServerSuccess(server.url);
        const data: OverpassResponse = await response.json();

        return data.elements.map((element): POI => {
          const poiLat = element.lat ?? element.center?.lat ?? 0;
          const poiLng = element.lon ?? element.center?.lon ?? 0;
          const distance = this.calculateDistance(lat, lng, poiLat, poiLng);
          const category = this.extractCategory(element.tags || {}, tags);

          return {
            id: `${element.type}/${element.id}`,
            lat: poiLat,
            lng: poiLng,
            name: element.tags?.name || null,
            category,
            tags: element.tags || {},
            distance,
          };
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Check if it's a timeout or network error
        if (err.name === "TimeoutError" || err.name === "AbortError" || err.message.includes("fetch")) {
          markServerFailed(server.url, 0);
        }

        lastError = err;
        continue; // Try next server
      }
    }

    throw lastError || new Error("All Overpass servers failed");
  }

  // Expose server status for monitoring
  static getServerStatus(): { name: string; available: boolean; cooldownRemaining: number }[] {
    const now = Date.now();
    return Array.from(serverStates.values()).map((s) => ({
      name: s.name,
      available: s.cooldownUntil <= now,
      cooldownRemaining: Math.max(0, Math.round((s.cooldownUntil - now) / 1000)),
    }));
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private extractCategory(
    tags: Record<string, string>,
    queryTags: string[]
  ): string {
    for (const queryTag of queryTags) {
      const [key, value] = queryTag.split("=");
      if (tags[key] === value) {
        return queryTag;
      }
    }
    return "unknown";
  }
}
