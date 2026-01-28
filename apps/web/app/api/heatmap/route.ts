import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { heatCells } from "@/lib/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { findCityForPoint, getCityBounds } from "@/lib/cities/bounds";
import { scheduleHeatmapJob, getJobById } from "@/lib/jobs/scheduler";
import { HEATMAP_GRID_STEP } from "@/lib/constants";

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
            eq(heatCells.gridStep, gridStep)
          )
        )
        .limit(50000); // Allow large responses for full coverage

      cells = dbCells;
    }

    // If no cells found and within a known city, try to auto-schedule computation
    if (cells.length === 0 && db && citySlug) {
      const cityBounds = getCityBounds(citySlug);
      if (cityBounds) {
        // Schedule the job
        const scheduleResult = await scheduleHeatmapJob(
          citySlug,
          cityBounds
        );

        if (scheduleResult) {
          const job = await getJobById(scheduleResult.jobId);
          jobStatus = {
            jobId: scheduleResult.jobId,
            status: scheduleResult.status,
            progress: job?.progress ?? null,
          };
        }
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
