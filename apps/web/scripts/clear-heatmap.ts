import { config } from "dotenv";
const envFile = process.argv.includes("--prod") ? ".env.production.local" : ".env.local";
config({ path: envFile });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { heatCells } from "../lib/db/schema";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  console.log("Using env:", envFile);

  // Count before delete
  const countBefore = await db.select({ count: sql<number>`count(*)` }).from(heatCells);
  console.log("Cells before delete:", countBefore[0].count);

  // Delete all heat cells
  await db.delete(heatCells);
  console.log("Deleted all heatmap data");

  // Count after delete
  const countAfter = await db.select({ count: sql<number>`count(*)` }).from(heatCells);
  console.log("Cells after delete:", countAfter[0].count);

  await client.end();
}

main().catch(console.error);
