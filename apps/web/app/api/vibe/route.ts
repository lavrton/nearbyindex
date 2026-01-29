import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import {
  generateVibe,
  getRandomCachedVibe,
  getVariationCount,
  setCachedVibe,
  generateCacheKey,
  getLocalizedFallback,
} from "@/lib/vibe";
import type { VibeRequest, VibeResponse, VibeError } from "@/lib/vibe";

// Rate limit config for vibe endpoint: 10 requests per minute per IP
const VIBE_RATE_LIMIT = { maxRequests: 10, windowSeconds: 60 };

export async function POST(request: NextRequest) {
  // Check rate limit
  const ip = getClientIP(request);
  const rateLimit = await checkRateLimit(ip, "/api/vibe", VIBE_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(
          (rateLimit.resetAt.getTime() - Date.now()) / 1000
        ),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          "Retry-After": String(
            Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  // Parse request body
  let vibeRequest: VibeRequest;
  try {
    vibeRequest = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate request
  if (
    typeof vibeRequest.overall !== "number" ||
    !Array.isArray(vibeRequest.categories)
  ) {
    return NextResponse.json(
      { error: "Invalid request: overall (number) and categories (array) required" },
      { status: 400 }
    );
  }

  // Generate cache key
  const cacheKey = generateCacheKey(vibeRequest);

  // Check if we have 3 cached variations - if so, return a random one
  try {
    const variationCount = await getVariationCount(cacheKey);

    if (variationCount >= 3) {
      // All 3 variations exist, return a random cached one
      const cached = await getRandomCachedVibe(cacheKey);
      if (cached) {
        const response: VibeResponse = {
          comment: cached,
          cached: true,
          generatedAt: new Date().toISOString(),
        };
        return NextResponse.json(response, {
          headers: {
            "Cache-Control": "public, max-age=86400",
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Cache lookup error:", error);
    // Continue to generation if cache fails
  }

  // Generate a new vibe (either no cached variations or < 3 exist)
  try {
    const comment = await generateVibe(vibeRequest);

    // Store as next variation (non-blocking)
    setCachedVibe(cacheKey, comment).catch((err) =>
      console.error("Cache write error:", err)
    );

    const response: VibeResponse = {
      comment,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=86400",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Vibe generation error:", error);

    // Return fallback on error
    const fallback = getLocalizedFallback(
      vibeRequest.overall,
      vibeRequest.locale || "en"
    );

    const errorResponse: VibeError = {
      error: "Generation failed, using fallback",
      fallback,
    };

    return NextResponse.json(errorResponse, {
      status: 200, // Return 200 with fallback so client can still show something
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  }
}
