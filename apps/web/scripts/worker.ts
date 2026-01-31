/**
 * Background Worker for Job Processing
 *
 * For platforms without cron support (Railway, Render, etc.)
 * Run as a separate service: `npx tsx scripts/worker.ts`
 *
 * Environment variables:
 *   DATABASE_URL - Required
 *   WORKER_POLL_INTERVAL - Interval between job checks in ms (default: 2000 = 2 sec)
 *   WORKER_CHUNK_SIZE - Cells to process per iteration (default: 500)
 *   MAX_CONCURRENT_JOBS - Number of jobs to process in parallel (default: 4)
 */

// Load .env.local for local development
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  resetStaleJobs,
  getAllRunningJobs,
  getNextPendingJobs,
  markJobRunning,
  getPendingJobCount,
  getMaxConcurrentJobs,
} from "../lib/jobs/scheduler";
import type { Job } from "../lib/db/schema";
import { processHeatmapChunk } from "../lib/jobs/heatmap-processor";
import { JOB_TYPES } from "../lib/jobs/types";

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || "2000", 10);
const CHUNK_SIZE = parseInt(process.env.WORKER_CHUNK_SIZE || "500", 10);

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

// Track state for each job being processed
interface JobState {
  startTime: number;
  totalProcessed: number;
}

const jobStates = new Map<number, JobState>();

async function processJob(job: Job): Promise<boolean> {
  if (job.type !== JOB_TYPES.HEATMAP_COMPUTE) {
    return false;
  }

  // Get or create job state
  let state = jobStates.get(job.id);
  if (!state) {
    state = {
      startTime: Date.now(),
      totalProcessed: job.progress || 0,
    };
    jobStates.set(job.id, state);
  }

  const result = await processHeatmapChunk(job, CHUNK_SIZE);
  state.totalProcessed += result.processed;

  const elapsed = Date.now() - state.startTime;
  const rate = state.totalProcessed / (elapsed / 1000);
  const remaining = (job.totalItems || 0) - state.totalProcessed;
  const eta = rate > 0 ? (remaining / rate) * 1000 : 0;

  console.log(
    `[${ts()}] Job #${job.id} ${progressBar(result.progress)} ${result.progress}% ` +
      `| ${state.totalProcessed}/${job.totalItems} cells | ${rate.toFixed(1)}/s | ETA: ${formatDuration(eta)}` +
      (result.errors > 0 ? ` | ${result.errors} errors` : "")
  );

  if (!result.hasMore) {
    const totalTime = Date.now() - state.startTime;
    console.log(`[${ts()}] Job #${job.id} completed in ${formatDuration(totalTime)}!`);
    jobStates.delete(job.id);
    return false; // Job done
  }

  return true; // Job has more work
}

async function runWorker() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const maxConcurrent = getMaxConcurrentJobs();

  console.log("Background Worker Started");
  console.log("=========================");
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`Chunk size: ${CHUNK_SIZE}`);
  console.log(`Max concurrent jobs: ${maxConcurrent}`);
  console.log("");

  while (true) {
    try {
      // Reset stale jobs
      const resetCount = await resetStaleJobs();
      if (resetCount > 0) {
        console.log(`[${ts()}] Reset ${resetCount} stale jobs`);
      }

      // Get all running jobs
      let runningJobs = await getAllRunningJobs();

      // Start new jobs if we have capacity
      const availableSlots = maxConcurrent - runningJobs.length;
      if (availableSlots > 0) {
        const pendingJobs = await getNextPendingJobs(availableSlots);
        for (const job of pendingJobs) {
          await markJobRunning(job.id);
          console.log(`[${ts()}] Started job #${job.id} (${job.type}) - ${job.totalItems} items`);
        }
        // Re-fetch running jobs after starting new ones
        if (pendingJobs.length > 0) {
          runningJobs = await getAllRunningJobs();
        }
      }

      if (runningJobs.length === 0) {
        const pendingCount = await getPendingJobCount();
        console.log(`[${ts()}] Idle - ${pendingCount} pending jobs`);
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        continue;
      }

      // Process all running jobs in parallel
      const chunkStartTime = Date.now();
      const maxProcessingTime = POLL_INTERVAL * 0.8;

      while (Date.now() - chunkStartTime < maxProcessingTime) {
        // Process one chunk for each job in parallel
        const results = await Promise.all(
          runningJobs.map((job) => processJob(job).catch((err) => {
            console.error(`[${ts()}] Error processing job #${job.id}:`, err);
            return false;
          }))
        );

        // Remove completed jobs from the list
        runningJobs = runningJobs.filter((_, i) => results[i]);

        if (runningJobs.length === 0) {
          break; // All jobs completed
        }

        // Re-fetch jobs to get updated state
        runningJobs = await getAllRunningJobs();
        if (runningJobs.length === 0) break;
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
