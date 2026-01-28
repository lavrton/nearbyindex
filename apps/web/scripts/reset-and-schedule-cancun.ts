import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { jobs, heatCells } from "../lib/db/schema";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  // 1. Cancel all jobs
  console.log("Canceling all jobs...");
  const canceledJobs = await db.update(jobs).set({ status: "failed", error: "Canceled - reset" }).returning({ id: jobs.id });
  console.log("  Canceled " + canceledJobs.length + " jobs");

  // 2. Clear all heatmap data
  console.log("Clearing all heatmap data...");
  const deleted = await db.delete(heatCells).returning({ id: heatCells.id });
  console.log("  Deleted " + deleted.length + " cells");

  // 3. Schedule new Cancun job
  console.log("Scheduling Cancun job...");
  const bounds = { minLat: 21.05, maxLat: 21.2, minLng: -86.92, maxLng: -86.75 };
  const gridStep = 0.0025;

  const latSteps = Math.ceil((bounds.maxLat - bounds.minLat) / gridStep);
  const lngSteps = Math.ceil((bounds.maxLng - bounds.minLng) / gridStep);
  const totalItems = latSteps * lngSteps;

  const [newJob] = await db.insert(jobs).values({
    type: "heatmap_compute",
    status: "pending",
    progress: 0,
    totalItems,
    metadata: {
      bounds,
      gridStep,
      lastProcessedIndex: 0,
    },
  }).returning();

  console.log("  Created job #" + newJob.id + " with " + totalItems + " cells to compute");
  console.log("  Grid: " + latSteps + " x " + lngSteps + " at step " + gridStep);

  await client.end();
  console.log("\nDone! Start the worker to process the job.");
}

main();
