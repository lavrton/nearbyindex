import { NextRequest, NextResponse } from "next/server";
import { calculateScore } from "@/lib/score/engine";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { ensureHeatmapCoverage } from "@/lib/jobs/scheduler";

export async function GET(request: NextRequest) {
  // Check rate limit
  const ip = getClientIP(request);
  const rateLimit = await checkRateLimit(ip, "/api/score");

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
          "Retry-After": String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
        },
      }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng parameters are required" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return NextResponse.json(
      { error: "Invalid lat or lng values" },
      { status: 400 }
    );
  }

  // Validate coordinate ranges
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return NextResponse.json(
      { error: "Coordinates out of range" },
      { status: 400 }
    );
  }

  try {
    const score = await calculateScore(latNum, lngNum);

    // Auto-schedule heatmap computation if this area isn't covered (non-blocking)
    ensureHeatmapCoverage(latNum, lngNum).catch(() => {});

    return NextResponse.json(score, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Score calculation error:", error);
    return NextResponse.json(
      { error: "Score calculation failed" },
      { status: 500 }
    );
  }
}
