import { getDb } from "@/lib/db/client";
import { jobs, cities, heatCells, overturePois } from "@/lib/db/schema";
import { eq, and, lt, asc, sql, or, gte, lte } from "drizzle-orm";
import { JOB_TYPES, JOB_STATUS, type HeatmapJobMetadata } from "./types";
import { getCityBounds, type CityBounds } from "@/lib/cities/bounds";
import { HEATMAP_GRID_STEP } from "@/lib/constants";
const REGION_SIZE = 0.15; // ~15km region for auto-scheduled jobs
const STALE_JOB_MINUTES = 10;
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || "4", 10);

export interface ScheduleResult {
  jobId: number;
  status: string;
  isNew: boolean;
}

/**
 * Schedule a heatmap computation job for a city
 */
export async function scheduleHeatmapJob(
  citySlug: string,
  bounds?: CityBounds
): Promise<ScheduleResult | null> {
  const database = getDb();

  // Get bounds from static config if not provided
  const jobBounds = bounds ?? getCityBounds(citySlug);
  if (!jobBounds) {
    return null;
  }

  // Check if city exists in database (only need id)
  const [city] = await database
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.slug, citySlug))
    .limit(1);

  const cityId = city?.id ?? null;

  // Check for existing pending or running job for this city with same grid step
  const existingJob = await database
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.type, JOB_TYPES.HEATMAP_COMPUTE),
        or(
          eq(jobs.status, JOB_STATUS.PENDING),
          eq(jobs.status, JOB_STATUS.RUNNING)
        ),
        cityId ? eq(jobs.cityId, cityId) : sql`1=1`,
        sql`(metadata->>'gridStep')::float = ${HEATMAP_GRID_STEP}`
      )
    )
    .limit(1);

  if (existingJob.length > 0) {
    return {
      jobId: existingJob[0].id,
      status: existingJob[0].status,
      isNew: false,
    };
  }

  // Calculate total items (grid points)
  const latSteps = Math.ceil((jobBounds.maxLat - jobBounds.minLat) / HEATMAP_GRID_STEP);
  const lngSteps = Math.ceil((jobBounds.maxLng - jobBounds.minLng) / HEATMAP_GRID_STEP);
  const totalItems = latSteps * lngSteps;

  const metadata: HeatmapJobMetadata = {
    bounds: jobBounds,
    gridStep: HEATMAP_GRID_STEP,
    lastProcessedIndex: 0,
  };

  // Create new job
  const [newJob] = await database
    .insert(jobs)
    .values({
      type: JOB_TYPES.HEATMAP_COMPUTE,
      status: JOB_STATUS.PENDING,
      cityId,
      progress: 0,
      totalItems,
      metadata,
    })
    .returning();

  return {
    jobId: newJob.id,
    status: newJob.status,
    isNew: true,
  };
}

/**
 * Get count of currently running jobs
 */
export async function getRunningJobCount(): Promise<number> {
  const database = getDb();

  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.RUNNING));

  return Number(result[0]?.count ?? 0);
}

/**
 * Get count of pending jobs
 */
export async function getPendingJobCount(): Promise<number> {
  const database = getDb();

  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.PENDING));

  return Number(result[0]?.count ?? 0);
}

/**
 * Get the next pending job (oldest first)
 */
export async function getNextPendingJob() {
  const database = getDb();

  const [job] = await database
    .select()
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.PENDING))
    .orderBy(asc(jobs.createdAt))
    .limit(1);

  return job ?? null;
}

/**
 * Get the currently running job (if any)
 */
export async function getRunningJob() {
  const database = getDb();

  const [job] = await database
    .select()
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.RUNNING))
    .orderBy(asc(jobs.startedAt))
    .limit(1);

  return job ?? null;
}

/**
 * Get all currently running jobs
 */
export async function getAllRunningJobs() {
  const database = getDb();

  return database
    .select()
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.RUNNING))
    .orderBy(asc(jobs.startedAt));
}

/**
 * Get multiple pending jobs (oldest first)
 */
export async function getNextPendingJobs(limit: number) {
  const database = getDb();

  return database
    .select()
    .from(jobs)
    .where(eq(jobs.status, JOB_STATUS.PENDING))
    .orderBy(asc(jobs.createdAt))
    .limit(limit);
}

/**
 * Get max concurrent jobs setting
 */
export function getMaxConcurrentJobs(): number {
  return MAX_CONCURRENT_JOBS;
}

/**
 * Mark a job as running
 */
export async function markJobRunning(jobId: number): Promise<void> {
  const database = getDb();

  await database
    .update(jobs)
    .set({
      status: JOB_STATUS.RUNNING,
      startedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Mark a job as completed
 */
export async function markJobCompleted(jobId: number): Promise<void> {
  const database = getDb();

  await database
    .update(jobs)
    .set({
      status: JOB_STATUS.COMPLETED,
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Mark a job as failed
 */
export async function markJobFailed(jobId: number, error: string): Promise<void> {
  const database = getDb();

  await database
    .update(jobs)
    .set({
      status: JOB_STATUS.FAILED,
      error,
      completedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

/**
 * Update job progress and metadata
 */
export async function updateJobProgress(
  jobId: number,
  progress: number,
  metadata?: Partial<HeatmapJobMetadata>
): Promise<void> {
  const database = getDb();

  const updates: Record<string, unknown> = { progress };

  if (metadata) {
    // Merge metadata with existing
    const [currentJob] = await database
      .select({ metadata: jobs.metadata })
      .from(jobs)
      .where(eq(jobs.id, jobId));

    const currentMetadata = (currentJob?.metadata as HeatmapJobMetadata) ?? {};
    updates.metadata = { ...currentMetadata, ...metadata };
  }

  await database.update(jobs).set(updates).where(eq(jobs.id, jobId));
}

/**
 * Reset stale jobs (running for too long)
 */
export async function resetStaleJobs(): Promise<number> {
  const database = getDb();

  const staleThreshold = new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000);

  const result = await database
    .update(jobs)
    .set({
      status: JOB_STATUS.PENDING,
      startedAt: null,
    })
    .where(
      and(
        eq(jobs.status, JOB_STATUS.RUNNING),
        lt(jobs.startedAt, staleThreshold)
      )
    )
    .returning({ id: jobs.id });

  return result.length;
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: number) {
  const database = getDb();

  const [job] = await database
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  return job ?? null;
}

/**
 * Check if we can start a new job
 */
export async function canStartNewJob(): Promise<boolean> {
  const runningCount = await getRunningJobCount();
  return runningCount < MAX_CONCURRENT_JOBS;
}

/**
 * Check if heatmap data exists near a point
 */
export async function hasHeatmapCoverage(
  lat: number,
  lng: number
): Promise<boolean> {
  const database = getDb();

  // Check if there's a heat cell within one grid step of the point at our standard resolution
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(heatCells)
    .where(
      and(
        gte(heatCells.lat, lat - HEATMAP_GRID_STEP),
        lte(heatCells.lat, lat + HEATMAP_GRID_STEP),
        gte(heatCells.lng, lng - HEATMAP_GRID_STEP),
        lte(heatCells.lng, lng + HEATMAP_GRID_STEP),
        eq(heatCells.gridStep, HEATMAP_GRID_STEP)
      )
    )
    .limit(1);

  return Number(result?.count ?? 0) > 0;
}

/**
 * Check if there are any POIs in a region
 */
async function hasPoisInRegion(
  lat: number,
  lng: number,
  radiusDegrees: number = REGION_SIZE / 2
): Promise<boolean> {
  const database = getDb();

  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(overturePois)
    .where(
      and(
        gte(overturePois.lat, lat - radiusDegrees),
        lte(overturePois.lat, lat + radiusDegrees),
        gte(overturePois.lng, lng - radiusDegrees),
        lte(overturePois.lng, lng + radiusDegrees)
      )
    )
    .limit(1);

  return Number(result?.count ?? 0) > 0;
}

/**
 * Check if there's already a pending/running job that covers a point
 */
async function hasOverlappingJob(lat: number, lng: number): Promise<boolean> {
  const database = getDb();

  const activeJobs = await database
    .select({ metadata: jobs.metadata })
    .from(jobs)
    .where(
      and(
        eq(jobs.type, JOB_TYPES.HEATMAP_COMPUTE),
        or(
          eq(jobs.status, JOB_STATUS.PENDING),
          eq(jobs.status, JOB_STATUS.RUNNING)
        )
      )
    );

  for (const job of activeJobs) {
    const meta = job.metadata as HeatmapJobMetadata | null;
    if (!meta?.bounds) continue;

    const { minLat, maxLat, minLng, maxLng } = meta.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return true;
    }
  }

  return false;
}

/**
 * Schedule a heatmap job for a region around a point (auto-triggered)
 */
export async function scheduleRegionalHeatmapJob(
  lat: number,
  lng: number
): Promise<ScheduleResult | null> {
  const database = getDb();

  // Check if there's already a job covering this area
  if (await hasOverlappingJob(lat, lng)) {
    return null;
  }

  // Skip remote areas with no POIs (oceans, deserts, etc.)
  if (!(await hasPoisInRegion(lat, lng))) {
    console.log(
      `[auto-schedule] Skipped remote area (${lat.toFixed(4)}, ${lng.toFixed(4)}) - no POIs found`
    );
    return null;
  }

  // Create bounds centered on the point
  const halfSize = REGION_SIZE / 2;
  const bounds: CityBounds = {
    minLat: lat - halfSize,
    maxLat: lat + halfSize,
    minLng: lng - halfSize,
    maxLng: lng + halfSize,
  };

  // Calculate total items (grid points)
  const latSteps = Math.ceil((bounds.maxLat - bounds.minLat) / HEATMAP_GRID_STEP);
  const lngSteps = Math.ceil((bounds.maxLng - bounds.minLng) / HEATMAP_GRID_STEP);
  const totalItems = latSteps * lngSteps;

  const metadata: HeatmapJobMetadata = {
    bounds,
    gridStep: HEATMAP_GRID_STEP,
    lastProcessedIndex: 0,
  };

  // Create new job
  const [newJob] = await database
    .insert(jobs)
    .values({
      type: JOB_TYPES.HEATMAP_COMPUTE,
      status: JOB_STATUS.PENDING,
      cityId: null,
      progress: 0,
      totalItems,
      metadata,
    })
    .returning();

  console.log(
    `[auto-schedule] Created heatmap job #${newJob.id} for region around (${lat.toFixed(4)}, ${lng.toFixed(4)}) - ${totalItems} cells`
  );

  return {
    jobId: newJob.id,
    status: newJob.status,
    isNew: true,
  };
}

/**
 * Check and schedule heatmap if needed for a point (non-blocking)
 */
export async function ensureHeatmapCoverage(
  lat: number,
  lng: number
): Promise<void> {
  try {
    const hasCoverage = await hasHeatmapCoverage(lat, lng);
    if (!hasCoverage) {
      await scheduleRegionalHeatmapJob(lat, lng);
    }
  } catch (error) {
    // Don't fail the main request if auto-scheduling fails
    console.error("[auto-schedule] Error:", error);
  }
}
