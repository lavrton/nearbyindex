import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { jobs, heatCells } from "../lib/db/schema";
import { desc, sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface JobMeta {
  gridStep?: number;
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

async function main() {
  // All jobs
  console.log("=== ALL JOBS ===");
  const allJobs = await db
    .select()
    .from(jobs)
    .orderBy(desc(jobs.createdAt));

  for (const j of allJobs) {
    const meta = j.metadata as JobMeta | null;
    let boundsStr = "no bounds";
    if (meta?.bounds) {
      const b = meta.bounds;
      boundsStr = "lat: " + b.minLat.toFixed(2) + "-" + b.maxLat.toFixed(2) + ", lng: " + b.minLng.toFixed(2) + "-" + b.maxLng.toFixed(2);
    }
    console.log("#" + j.id + " | " + j.status.padEnd(9) + " | " + j.progress + "/" + j.totalItems + " | step: " + meta?.gridStep + " | " + boundsStr);
  }

  if (allJobs.length === 0) {
    console.log("  (no jobs)");
  }

  // Heat cells summary by approximate region
  console.log("\n=== HEAT CELLS BY REGION ===");
  const cellSummary = await db
    .select({
      latBucket: sql<number>`floor(lat / 10) * 10`,
      lngBucket: sql<number>`floor(lng / 10) * 10`,
      gridStep: heatCells.gridStep,
      count: sql<number>`count(*)`,
    })
    .from(heatCells)
    .groupBy(sql`floor(lat / 10) * 10`, sql`floor(lng / 10) * 10`, heatCells.gridStep)
    .orderBy(desc(sql`count(*)`));

  for (const r of cellSummary) {
    console.log("lat ~" + r.latBucket + ", lng ~" + r.lngBucket + " | step: " + r.gridStep + " | " + r.count + " cells");
  }

  await client.end();
}

main();
