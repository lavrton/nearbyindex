import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { jobs } from "../lib/db/schema";
import { desc } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  const allJobs = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      cityId: jobs.cityId,
      progress: jobs.progress,
      totalItems: jobs.totalItems,
      metadata: jobs.metadata,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .orderBy(desc(jobs.createdAt))
    .limit(10);

  console.log("Recent jobs:");
  for (const j of allJobs) {
    const meta = j.metadata as { gridStep?: number; bounds?: object } | null;
    console.log(`  #${j.id} | ${j.type} | ${j.status} | progress: ${j.progress}/${j.totalItems} | gridStep: ${meta?.gridStep} | ${j.createdAt.toISOString().slice(0, 16)}`);
  }

  if (allJobs.length === 0) {
    console.log("  (no jobs found)");
  }

  await client.end();
}

main();
