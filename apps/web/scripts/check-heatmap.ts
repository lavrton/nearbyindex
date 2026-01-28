import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { heatCells } from "../lib/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Cancun bounds
const bounds = { minLat: 21.05, maxLat: 21.2, minLng: -86.92, maxLng: -86.75 };

async function main() {
  const result = await db
    .select({
      gridStep: heatCells.gridStep,
      count: sql<number>`count(*)`,
    })
    .from(heatCells)
    .where(
      and(
        gte(heatCells.lat, bounds.minLat),
        lte(heatCells.lat, bounds.maxLat),
        gte(heatCells.lng, bounds.minLng),
        lte(heatCells.lng, bounds.maxLng)
      )
    )
    .groupBy(heatCells.gridStep);

  console.log("Heatmap cells in Cancun bounds:");
  for (const r of result) {
    console.log(`  gridStep: ${r.gridStep} | cells: ${r.count}`);
  }

  if (result.length === 0) {
    console.log("  (no cells found)");
  }

  await client.end();
}

main();
