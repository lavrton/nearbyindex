/**
 * Job Processor Script (Development)
 *
 * Usage:
 *   npx tsx scripts/process-jobs.ts
 *
 * This script continuously processes jobs until none remain.
 * For local development without Vercel Cron.
 */

import {
  resetStaleJobs,
  getRunningJob,
  getNextPendingJob,
  canStartNewJob,
  markJobRunning,
} from "../lib/jobs/scheduler";
import { processHeatmapChunk } from "../lib/jobs/heatmap-processor";
import { JOB_TYPES } from "../lib/jobs/types";

const POLL_INTERVAL_MS = 1000; // 1 second between checks

async function processJobs() {
  // Verify DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("\nJob Processor Started");
  console.log("======================");
  console.log("Press Ctrl+C to stop\n");

  let processedTotal = 0;
  let errorsTotal = 0;

  while (true) {
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
            console.log(`\nStarted job ${job.id} (${job.type})`);
          }
        }
      }

      if (!job) {
        console.log("No jobs to process. Waiting...");
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
        continue;
      }

      // Process based on job type
      if (job.type === JOB_TYPES.HEATMAP_COMPUTE) {
        const result = await processHeatmapChunk(job, 100); // Larger chunks for dev

        processedTotal += result.processed;
        errorsTotal += result.errors;

        process.stdout.write(
          `\rJob ${job.id}: ${result.progress}% (${result.processed} cells, ${result.errors} errors)`
        );

        if (!result.hasMore) {
          console.log(`\nJob ${job.id} completed!`);
          console.log(`  Total processed: ${processedTotal}`);
          console.log(`  Total errors: ${errorsTotal}`);
          processedTotal = 0;
          errorsTotal = 0;
        }
      } else {
        console.log(`Unknown job type: ${job.type}`);
      }

      // Small delay between processing
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error("\nError processing jobs:", error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    }
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down...");
  process.exit(0);
});

processJobs().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
