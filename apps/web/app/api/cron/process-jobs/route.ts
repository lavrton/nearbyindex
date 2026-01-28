import { NextRequest, NextResponse } from "next/server";
import {
  resetStaleJobs,
  getRunningJob,
  getNextPendingJob,
  canStartNewJob,
  markJobRunning,
} from "@/lib/jobs/scheduler";
import { processHeatmapChunk } from "@/lib/jobs/heatmap-processor";
import { JOB_TYPES } from "@/lib/jobs/types";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Reset any stale jobs
    const resetCount = await resetStaleJobs();
    if (resetCount > 0) {
      console.log(`Reset ${resetCount} stale jobs`);
    }

    // First, try to continue a running job
    let job = await getRunningJob();

    // If no running job, try to start a pending one
    if (!job) {
      const canStart = await canStartNewJob();
      if (canStart) {
        job = await getNextPendingJob();
        if (job) {
          await markJobRunning(job.id);
          console.log(`Started job ${job.id}`);
        }
      }
    }

    if (!job) {
      return NextResponse.json({
        message: "No jobs to process",
        staleReset: resetCount,
      });
    }

    // Process based on job type
    if (job.type === JOB_TYPES.HEATMAP_COMPUTE) {
      const result = await processHeatmapChunk(job);

      return NextResponse.json({
        jobId: job.id,
        type: job.type,
        processed: result.processed,
        errors: result.errors,
        progress: result.progress,
        hasMore: result.hasMore,
        staleReset: resetCount,
      });
    }

    return NextResponse.json({
      error: `Unknown job type: ${job.type}`,
      jobId: job.id,
    });
  } catch (error) {
    console.error("Process jobs error:", error);
    return NextResponse.json(
      { error: "Failed to process jobs" },
      { status: 500 }
    );
  }
}
