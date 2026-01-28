/**
 * Heatmap Precompute Script
 *
 * Usage:
 *   npx tsx scripts/precompute-heatmap.ts --city berlin
 *   npx tsx scripts/precompute-heatmap.ts --bbox 52.4,13.2,52.6,13.5 --step 0.005
 *
 * This script computes grocery scores for a grid of points and stores them in the database.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { heatCells, cities } from "../lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calculateGroceryScore } from "../lib/score/engine";
import { CITY_BOUNDS, getAvailableCities } from "../lib/cities/bounds";

interface Args {
  city?: string;
  bbox?: string;
  step: number;
  dryRun: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    step: 0.01, // ~1km default grid
    dryRun: false,
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--city" && process.argv[i + 1]) {
      args.city = process.argv[++i].toLowerCase();
    } else if (arg === "--bbox" && process.argv[i + 1]) {
      args.bbox = process.argv[++i];
    } else if (arg === "--step" && process.argv[i + 1]) {
      args.step = parseFloat(process.argv[++i]);
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function getBounds(args: Args): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (args.bbox) {
    const parts = args.bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return { minLat: parts[0], minLng: parts[1], maxLat: parts[2], maxLng: parts[3] };
    }
    console.error("Invalid bbox format. Use: minLat,minLng,maxLat,maxLng");
    return null;
  }

  if (args.city && CITY_BOUNDS[args.city]) {
    return CITY_BOUNDS[args.city];
  }

  console.error(`Unknown city: ${args.city}`);
  console.error(`Available cities: ${getAvailableCities().join(", ")}`);
  return null;
}

async function main() {
  const args = parseArgs();
  const bounds = getBounds(args);

  if (!bounds) {
    console.log("\nUsage:");
    console.log("  npx tsx scripts/precompute-heatmap.ts --city berlin");
    console.log("  npx tsx scripts/precompute-heatmap.ts --bbox 52.4,13.2,52.6,13.5");
    console.log("\nOptions:");
    console.log("  --city <name>   City name (berlin, munich, hamburg, vienna, paris)");
    console.log("  --bbox <coords> Bounding box: minLat,minLng,maxLat,maxLng");
    console.log("  --step <deg>    Grid step in degrees (default: 0.01 ≈ 1km)");
    console.log("  --dry-run       Show what would be computed without saving");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  // Generate grid points
  const points: { lat: number; lng: number }[] = [];
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += args.step) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += args.step) {
      points.push({
        lat: Math.round(lat * 100000) / 100000,
        lng: Math.round(lng * 100000) / 100000,
      });
    }
  }

  console.log(`\nHeatmap Precompute`);
  console.log(`==================`);
  console.log(`Bounds: ${bounds.minLat},${bounds.minLng} to ${bounds.maxLat},${bounds.maxLng}`);
  console.log(`Grid step: ${args.step}° (≈${Math.round(args.step * 111)}km)`);
  console.log(`Total points: ${points.length}`);
  console.log(`Dry run: ${args.dryRun}`);
  console.log();

  if (args.dryRun) {
    console.log("Dry run mode - no data will be saved");
    console.log("Sample points:", points.slice(0, 5));
    await client.end();
    return;
  }

  let completed = 0;
  let errors = 0;
  const startTime = Date.now();

  // Process in batches to avoid overwhelming the API
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 2000; // 2 seconds between batches

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (point) => {
        try {
          const score = await calculateGroceryScore(point.lat, point.lng);
          return { ...point, score: Math.round(score), error: null };
        } catch (error) {
          return { ...point, score: 0, error: error instanceof Error ? error.message : "Unknown error" };
        }
      })
    );

    // Insert/update results
    for (const result of results) {
      if (result.error) {
        errors++;
        console.error(`Error at ${result.lat},${result.lng}: ${result.error}`);
        continue;
      }

      try {
        // Upsert: delete existing and insert new (including gridStep in unique constraint)
        await db.delete(heatCells).where(
          and(
            eq(heatCells.lat, result.lat),
            eq(heatCells.lng, result.lng),
            eq(heatCells.gridStep, args.step)
          )
        );

        await db.insert(heatCells).values({
          lat: result.lat,
          lng: result.lng,
          score: result.score,
          gridStep: args.step,
          computedAt: new Date(),
        });

        completed++;
      } catch (dbError) {
        errors++;
        console.error(`DB error at ${result.lat},${result.lng}:`, dbError);
      }
    }

    // Progress
    const progress = Math.round(((i + batch.length) / points.length) * 100);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\rProgress: ${progress}% (${completed} saved, ${errors} errors) - ${elapsed}s elapsed`);

    // Wait between batches to respect rate limits
    if (i + BATCH_SIZE < points.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(`\n\nCompleted!`);
  console.log(`  Saved: ${completed}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);

  await client.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
