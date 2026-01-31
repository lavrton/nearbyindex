import { getDb } from "@/lib/db/client";
import { heatCells, type Job } from "@/lib/db/schema";
import { sql, and, gte, lte, eq } from "drizzle-orm";
import { calculateGroceryScore } from "@/lib/score/engine";
import {
  updateJobProgress,
  markJobCompleted,
  markJobFailed,
} from "./scheduler";
import type { HeatmapJobMetadata } from "./types";
import { createBatchCalculator } from "./batch-score-calculator";

const DEFAULT_CHUNK_SIZE = parseInt(process.env.HEATMAP_CHUNK_SIZE || "100", 10);
const BATCH_SIZE = 1000; // Large batches for fewer DB round-trips
const BATCH_DELAY_MS = 0; // No delay needed for local DB

// Cache for batch calculator (one per job bounds)
let cachedCalculator: {
  boundsKey: string;
  calculator: Awaited<ReturnType<typeof createBatchCalculator>>;
} | null = null;

export interface ProcessResult {
  processed: number;
  errors: number;
  hasMore: boolean;
  progress: number;
}

/**
 * Generate all grid points for the given bounds
 */
/**
 * Snap a value to the nearest grid-aligned position
 * This ensures all jobs generate points on the same global grid
 */
function snapToGrid(value: number, gridStep: number, roundUp: boolean): number {
  const snapped = roundUp
    ? Math.ceil(value / gridStep) * gridStep
    : Math.floor(value / gridStep) * gridStep;
  return Math.round(snapped * 100000) / 100000;
}

function generateGridPoints(
  bounds: HeatmapJobMetadata["bounds"],
  gridStep: number
): Array<{ lat: number; lng: number; index: number }> {
  const points: Array<{ lat: number; lng: number; index: number }> = [];
  let index = 0;

  // Snap bounds to grid-aligned positions (global alignment)
  const startLat = snapToGrid(bounds.minLat, gridStep, true);
  const endLat = snapToGrid(bounds.maxLat, gridStep, false);
  const startLng = snapToGrid(bounds.minLng, gridStep, true);
  const endLng = snapToGrid(bounds.maxLng, gridStep, false);

  for (let lat = startLat; lat <= endLat; lat += gridStep) {
    for (let lng = startLng; lng <= endLng; lng += gridStep) {
      points.push({
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
        index,
      });
      index++;
    }
  }

  return points;
}

/**
 * Get or create a batch calculator for the given job bounds
 * Caches the calculator to avoid reloading POIs on every chunk
 */
async function getBatchCalculator(bounds: HeatmapJobMetadata["bounds"]) {
  const boundsKey = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;

  if (cachedCalculator && cachedCalculator.boundsKey === boundsKey) {
    return cachedCalculator.calculator;
  }

  console.log("Creating batch calculator (loading POIs into memory)...");
  const calculator = await createBatchCalculator(bounds);
  cachedCalculator = { boundsKey, calculator };
  return calculator;
}

/**
 * Filter out points that already have computed cells in the database
 */
async function filterExistingCells(
  points: Array<{ lat: number; lng: number; index: number }>,
  gridStep: number
): Promise<Array<{ lat: number; lng: number; index: number }>> {
  if (points.length === 0) return points;

  const database = getDb();

  // Get bounds of this batch
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Query existing cells in this batch's bounds
  const existingCells = await database
    .select({ lat: heatCells.lat, lng: heatCells.lng })
    .from(heatCells)
    .where(
      and(
        gte(heatCells.lat, minLat - 0.0001),
        lte(heatCells.lat, maxLat + 0.0001),
        gte(heatCells.lng, minLng - 0.0001),
        lte(heatCells.lng, maxLng + 0.0001),
        eq(heatCells.gridStep, gridStep)
      )
    );

  // Create lookup set (round to avoid floating point issues)
  const existingSet = new Set(
    existingCells.map(c => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`)
  );

  // Filter out existing points
  return points.filter(p =>
    !existingSet.has(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
  );
}

/**
 * Process a chunk of heatmap cells for a job
 * Returns whether there is more work to do
 *
 * Uses batch processing: loads all POIs into memory once, then calculates
 * scores without database queries. This is ~100x faster for remote databases.
 */
export async function processHeatmapChunk(
  job: Job,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<ProcessResult> {
  const database = getDb();
  const metadata = job.metadata as HeatmapJobMetadata;

  if (!metadata?.bounds) {
    await markJobFailed(job.id, "Job metadata missing bounds");
    return { processed: 0, errors: 1, hasMore: false, progress: 0 };
  }

  // Get batch calculator (loads POIs into memory on first call)
  const batchCalculator = await getBatchCalculator(metadata.bounds);

  const allPoints = generateGridPoints(metadata.bounds, metadata.gridStep);
  const startIndex = metadata.lastProcessedIndex ?? 0;
  const endIndex = Math.min(startIndex + chunkSize, allPoints.length);
  const pointsToProcess = allPoints.slice(startIndex, endIndex);

  // Filter out cells that already exist in the database
  const newPointsToProcess = await filterExistingCells(
    pointsToProcess,
    metadata.gridStep
  );

  // Log skip count
  const skipped = pointsToProcess.length - newPointsToProcess.length;
  if (skipped > 0) {
    console.log(`Skipping ${skipped} existing cells`);
  }

  let processed = 0;
  let errors = 0;

  // Process in batches - now purely CPU-bound, no DB queries per cell
  for (let i = 0; i < newPointsToProcess.length; i += BATCH_SIZE) {
    const batch = newPointsToProcess.slice(i, i + BATCH_SIZE);

    // Calculate scores in memory (no await needed - synchronous)
    const results = batch.map((point) => {
      try {
        const score = batchCalculator.calculateScore(point.lat, point.lng);
        return {
          lat: point.lat,
          lng: point.lng,
          score: Math.round(score),
          error: null as string | null,
        };
      } catch (error) {
        return {
          lat: point.lat,
          lng: point.lng,
          score: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    // Filter successful results and count errors
    const successfulResults = results.filter((r) => {
      if (r.error) {
        errors++;
        console.error(`Error at ${r.lat},${r.lng}: ${r.error}`);
        return false;
      }
      return true;
    });

    // Batch insert all successful results
    if (successfulResults.length > 0) {
      try {
        const values = successfulResults.map((result) => ({
          lat: result.lat,
          lng: result.lng,
          score: result.score,
          gridStep: metadata.gridStep,
          cityId: job.cityId,
          computedAt: new Date(),
        }));

        // Use ON CONFLICT to upsert (requires unique index on lat, lng, gridStep)
        await database
          .insert(heatCells)
          .values(values)
          .onConflictDoUpdate({
            target: [heatCells.lat, heatCells.lng, heatCells.gridStep],
            set: {
              score: sql`excluded.score`,
              computedAt: sql`excluded.computed_at`,
            },
          });

        processed += successfulResults.length;
      } catch (dbError) {
        errors += successfulResults.length;
        console.error(`DB batch error:`, dbError);
      }
    }

    // Delay between batches (except for last batch)
    if (i + BATCH_SIZE < newPointsToProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  const newIndex = endIndex;
  const hasMore = newIndex < allPoints.length;
  const progress = Math.round((newIndex / allPoints.length) * 100);

  // Update job progress
  await updateJobProgress(job.id, progress, {
    ...metadata,
    lastProcessedIndex: newIndex,
  });

  // Mark as completed if done
  if (!hasMore) {
    await markJobCompleted(job.id);
    // Clear the cached calculator when job completes
    cachedCalculator = null;
  }

  return {
    processed,
    errors,
    hasMore,
    progress,
  };
}

/**
 * Get estimated time remaining for a job
 */
export function estimateTimeRemaining(
  job: Job,
  processedPerSecond: number = 2
): number | null {
  const metadata = job.metadata as HeatmapJobMetadata;
  if (!metadata?.bounds || !job.totalItems) return null;

  const remaining = job.totalItems - (job.progress ?? 0);
  return Math.ceil(remaining / processedPerSecond);
}
