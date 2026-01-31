import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

// Default rate limits per endpoint
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "/api/score": { maxRequests: 300, windowSeconds: 60 }, // 300 requests per minute
  "/api/geocode": { maxRequests: 600, windowSeconds: 60 }, // 600 requests per minute
  "/api/heatmap": { maxRequests: 200, windowSeconds: 60 }, // 200 requests per minute
  default: { maxRequests: 1000, windowSeconds: 60 }, // 1000 requests per minute for unknown endpoints
};

/**
 * Hash an IP address for privacy-preserving rate limiting
 */
function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 64);
}

/**
 * Get the client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to localhost for local development
  return "127.0.0.1";
}

/**
 * Check and update rate limit for a request
 *
 * @param ip - Client IP address
 * @param endpoint - API endpoint path (e.g., "/api/score")
 * @param config - Optional custom rate limit config
 * @returns Rate limit result with remaining count and reset time
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  // If database is not configured, allow all requests (development mode)
  if (!db) {
    return {
      allowed: true,
      remaining: 999,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  const limits = config || DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS.default;
  const ipHash = hashIP(ip);
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (limits.windowSeconds * 1000)) * (limits.windowSeconds * 1000)
  );
  const resetAt = new Date(windowStart.getTime() + limits.windowSeconds * 1000);

  try {
    // Upsert: insert or increment counter atomically to avoid race conditions
    const result = await db
      .insert(rateLimits)
      .values({
        ipHash,
        endpoint,
        requestCount: 1,
        windowStart,
      })
      .onConflictDoUpdate({
        target: [rateLimits.ipHash, rateLimits.endpoint, rateLimits.windowStart],
        set: { requestCount: sql`${rateLimits.requestCount} + 1` },
      })
      .returning({ requestCount: rateLimits.requestCount });

    const currentCount = result[0].requestCount;
    const remaining = Math.max(0, limits.maxRequests - currentCount);

    if (currentCount > limits.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    // On database error, allow the request but log the issue
    console.error("Rate limit check failed:", error);
    return {
      allowed: true,
      remaining: limits.maxRequests,
      resetAt,
    };
  }
}

/**
 * Wrapper to apply rate limiting to an API route handler
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  config?: RateLimitConfig
) {
  return async (request: Request): Promise<Response> => {
    const ip = getClientIP(request);
    const endpoint = new URL(request.url).pathname;

    const result = await checkRateLimit(ip, endpoint, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(config?.maxRequests || DEFAULT_LIMITS[endpoint]?.maxRequests || DEFAULT_LIMITS.default.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetAt.toISOString(),
            "Retry-After": String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
          },
        }
      );
    }

    const response = await handler(request);

    // Add rate limit headers to successful responses
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Remaining", String(result.remaining));
    headers.set("X-RateLimit-Reset", result.resetAt.toISOString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
