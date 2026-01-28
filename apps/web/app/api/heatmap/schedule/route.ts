import { NextRequest, NextResponse } from "next/server";
import { scheduleHeatmapJob } from "@/lib/jobs/scheduler";
import { getCityBounds } from "@/lib/cities/bounds";

interface ScheduleRequest {
  citySlug: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScheduleRequest;
    const { citySlug } = body;

    if (!citySlug || typeof citySlug !== "string") {
      return NextResponse.json(
        { error: "citySlug is required" },
        { status: 400 }
      );
    }

    const bounds = getCityBounds(citySlug);
    if (!bounds) {
      return NextResponse.json(
        { error: `Unknown city: ${citySlug}` },
        { status: 400 }
      );
    }

    const result = await scheduleHeatmapJob(citySlug, bounds);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to schedule job" },
        { status: 500 }
      );
    }

    return NextResponse.json(result, {
      status: result.isNew ? 201 : 200,
    });
  } catch (error) {
    console.error("Schedule heatmap job error:", error);
    return NextResponse.json(
      { error: "Failed to schedule job" },
      { status: 500 }
    );
  }
}
