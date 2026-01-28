/**
 * Background Worker for Job Processing
 *
 * For platforms without cron support (Railway, Render, etc.)
 * Run as a separate service: `npx tsx scripts/worker.ts`
 *
 * Environment variables:
 *   DATABASE_URL - Required
 *   WORKER_POLL_INTERVAL - Interval between job checks in ms (default: 60000 = 1 min)
 *   WORKER_CHUNK_SIZE - Cells to process per iteration (default: 50)
 */

// Load .env.local for local development
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  resetStaleJobs,
  getRunningJob,
  getNextPendingJob,
  canStartNewJob,
  markJobRunning,
  getPendingJobCount,
} from "../lib/jobs/scheduler";
import { processHeatmapChunk } from "../lib/jobs/heatmap-processor";
import { JOB_TYPES } from "../lib/jobs/types";

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || "60000", 10);
const CHUNK_SIZE = parseInt(process.env.WORKER_CHUNK_SIZE || "50", 10);

// Helper to format time
function formatDuration(ms: number): string {
  if (ms < 1000) return ms + "ms";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return seconds + "s";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return minutes + "m " + secs + "s";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours + "h " + mins + "m";
}

// Helper to create progress bar
function progressBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "[" + "=".repeat(filled) + " ".repeat(empty) + "]";
}

async function runWorker() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("Background Worker Started");
  console.log("=========================");
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`Chunk size: ${CHUNK_SIZE}`);
  console.log("");

  let jobStartTime: number | null = null;
  let totalProcessed = 0;
  let currentJobId: number | null = null;

  while (true) {
    try {
      // Reset stale jobs
      const resetCount = await resetStaleJobs();
      if (resetCount > 0) {
        console.log(`[${ts()}] Reset ${resetCount} stale jobs`);
      }

      // Get job counts for status
      const pendingCount = await getPendingJobCount();

      // Get or start a job
      let job = await getRunningJob();

      if (job && job.id !== currentJobId) {
        // Resuming an existing running job
        currentJobId = job.id;
        jobStartTime = Date.now();
        totalProcessed = job.progress || 0;
        const pct = job.totalItems ? Math.round((totalProcessed / job.totalItems) * 100) : 0;
        console.log(`[${ts()}] Resuming job #${job.id} (${job.type}) - ${totalProcessed}/${job.totalItems} (${pct}%)`);
      }

      if (!job) {
        const canStart = await canStartNewJob();
        if (canStart) {
          job = await getNextPendingJob();
          if (job) {
            await markJobRunning(job.id);
            currentJobId = job.id;
            jobStartTime = Date.now();
            totalProcessed = job.progress || 0;
            console.log(`[${ts()}] Started job #${job.id} (${job.type}) - ${job.totalItems} items`);
          }
        }
      }

      if (job && job.type === JOB_TYPES.HEATMAP_COMPUTE) {
        // Track job start time if resuming
        if (!jobStartTime) {
          jobStartTime = Date.now();
          totalProcessed = job.progress || 0;
        }

        // Process until done or timeout approaching
        const chunkStartTime = Date.now();
        const maxProcessingTime = POLL_INTERVAL * 0.8;
        let chunkProcessed = 0;

        while (Date.now() - chunkStartTime < maxProcessingTime) {
          const result = await processHeatmapChunk(job, CHUNK_SIZE);
          chunkProcessed += result.processed;
          totalProcessed += result.processed;

          const elapsed = Date.now() - jobStartTime;
          const rate = totalProcessed / (elapsed / 1000);
          const remaining = (job.totalItems || 0) - totalProcessed;
          const eta = rate > 0 ? remaining / rate * 1000 : 0;

          console.log(
            `[${ts()}] Job #${job.id} ${progressBar(result.progress)} ${result.progress}% ` +
            `| ${totalProcessed}/${job.totalItems} cells | ${rate.toFixed(1)}/s | ETA: ${formatDuration(eta)}` +
            (result.errors > 0 ? ` | ${result.errors} errors` : "")
          );

          if (!result.hasMore) {
            const totalTime = Date.now() - jobStartTime;
            console.log(`[${ts()}] Job #${job.id} completed in ${formatDuration(totalTime)}!`);
            jobStartTime = null;
            totalProcessed = 0;
            currentJobId = null;
            break;
          }

          // Re-fetch job to get updated state
          job = await getRunningJob();
          if (!job) break;
        }
      } else if (!job) {
        console.log(`[${ts()}] Idle - ${pendingCount} pending jobs`);
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error(`[${ts()}] Worker error:`, error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

function ts(): string {
  return new Date().toISOString().slice(11, 19);
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  process.exit(0);
});

runWorker().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
