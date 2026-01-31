import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { heatCells } from "@/lib/db/schema";
import { and, gte, lte, eq, gt } from "drizzle-orm";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { findCityForPoint, getCityBounds } from "@/lib/cities/bounds";
import { scheduleHeatmapJob, scheduleRegionalHeatmapJob, getJobById } from "@/lib/jobs/scheduler";
import { HEATMAP_GRID_STEP } from "@/lib/constants";

// Minimum score to return (cells below this are transparent on frontend anyway)
const MIN_VISIBLE_SCORE = 30;

interface HeatCell {
  lat: number;
  lng: number;
  score: number;
}

interface HeatmapResponse {
  cells: HeatCell[];
  gridStep: number;
  jobStatus?: {
    jobId: number;
    status: string;
    progress: number | null;
  };
}

export async function GET(request: NextRequest) {
  // Check rate limit
  const ip = getClientIP(request);
  const rateLimit = await checkRateLimit(ip, "/api/heatmap");

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
  const minLat = parseFloat(searchParams.get("minLat") || "0");
  const maxLat = parseFloat(searchParams.get("maxLat") || "0");
  const minLng = parseFloat(searchParams.get("minLng") || "0");
  const maxLng = parseFloat(searchParams.get("maxLng") || "0");

  // Validate bounds
  if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLng) || isNaN(maxLng)) {
    return NextResponse.json(
      { error: "Invalid bounds" },
      { status: 400 }
    );
  }

  // Find center of requested bounds to detect city
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const citySlug = findCityForPoint(centerLat, centerLng);

  // Use standard grid step for all heatmap operations
  const gridStep = HEATMAP_GRID_STEP;

  try {
    let cells: HeatCell[] = [];
    let jobStatus: HeatmapResponse["jobStatus"] | undefined;

    // Try to fetch from database if configured
    if (db) {
      const dbCells = await db
        .select({
          lat: heatCells.lat,
          lng: heatCells.lng,
          score: heatCells.score,
        })
        .from(heatCells)
        .where(
          and(
            gte(heatCells.lat, minLat),
            lte(heatCells.lat, maxLat),
            gte(heatCells.lng, minLng),
            lte(heatCells.lng, maxLng),
            eq(heatCells.gridStep, gridStep),
            gte(heatCells.score, MIN_VISIBLE_SCORE) // Skip invisible cells
          )
        );

      cells = dbCells;
    }

    // Check if cells span the full viewport (not clustered in one area)
    // Calculate the bounding box of existing cells and compare to viewport
    let hasFullCoverage = false;
    if (cells.length > 0) {
      const cellMinLat = Math.min(...cells.map((c) => c.lat));
      const cellMaxLat = Math.max(...cells.map((c) => c.lat));
      const cellMinLng = Math.min(...cells.map((c) => c.lng));
      const cellMaxLng = Math.max(...cells.map((c) => c.lng));

      const viewportLatRange = maxLat - minLat;
      const viewportLngRange = maxLng - minLng;
      const cellLatRange = cellMaxLat - cellMinLat;
      const cellLngRange = cellMaxLng - cellMinLng;

      // Consider covered if cells span at least 50% of viewport in both dimensions
      const latCoverage = viewportLatRange > 0 ? cellLatRange / viewportLatRange : 0;
      const lngCoverage = viewportLngRange > 0 ? cellLngRange / viewportLngRange : 0;
      hasFullCoverage = latCoverage >= 0.5 && lngCoverage >= 0.5;
    }

    // If viewport is not fully covered, try to auto-schedule computation
    if (!hasFullCoverage && db) {
      let scheduleResult;

      if (citySlug) {
        // Known city - use full city bounds
        const cityBounds = getCityBounds(citySlug);
        if (cityBounds) {
          scheduleResult = await scheduleHeatmapJob(citySlug, cityBounds);
        }
      } else {
        // Unknown area - create regional job around center
        scheduleResult = await scheduleRegionalHeatmapJob(centerLat, centerLng);
      }

      if (scheduleResult) {
        const job = await getJobById(scheduleResult.jobId);
        jobStatus = {
          jobId: scheduleResult.jobId,
          status: scheduleResult.status,
          progress: job?.progress ?? null,
        };
      }
    }

    const response: HeatmapResponse = {
      cells,
      gridStep,
      ...(jobStatus && { jobStatus }),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": cells.length > 0 ? "public, max-age=300, s-maxage=300" : "no-cache",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Heatmap data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
