#!/usr/bin/env tsx
/**
 * Setup Overture POI data
 *
 * Downloads POI data from Overture Maps and imports to database.
 * This is used for the LocalDB POI provider which enables fast,
 * offline-capable scoring without hitting external APIs.
 *
 * Prerequisites (install once):
 *   pipx install overturemaps   # or: pip install overturemaps
 *   brew install duckdb         # or download from duckdb.org
 *
 * Usage:
 *   pnpm setup:pois:cancun    # Development: Cancun area (~30k POIs)
 *   pnpm setup:pois:world     # Production: worldwide (~50M+ POIs)
 *   pnpm setup:pois --bbox=minLng,minLat,maxLng,maxLat  # Custom area
 *
 * Examples:
 *   pnpm setup:pois --bbox=-74.3,40.5,-73.7,40.9  # NYC area
 *   pnpm setup:pois --bbox=2.2,48.8,2.5,48.9      # Paris area
 *
 * World setup notes:
 *   - Download size: ~8-10GB
 *   - Database size: ~15-20GB
 *   - Processing time: 10-30 minutes depending on hardware
 *   - Recommended: Run on production server with fast disk
 *
 * Environment variables:
 *   DATABASE_URL - Required
 */

// Load .env.local for local development
import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { homedir } from "os";
import { getDb } from "../lib/db/client";
import { overturePois } from "../lib/db/schema";

const TEMP_FILE = "/tmp/overture_places.parquet";

// Extend PATH to include common pipx/homebrew locations
const EXTENDED_PATH = [
  `${homedir()}/.local/bin`,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  process.env.PATH,
].join(":");

const execEnv = { ...process.env, PATH: EXTENDED_PATH };

// Parse command line arguments
function parseArgs(): { bbox: string } {
  const args = process.argv.slice(2);
  const bboxArg = args.find((a) => a.startsWith("--bbox="));

  // Default: small test area (use explicit bbox for larger areas)
  const bbox = bboxArg ? bboxArg.replace("--bbox=", "") : "-180,-90,180,90";

  return { bbox };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const { bbox } = parseArgs();

  console.log("Overture POI Setup");
  console.log("==================");
  console.log(`Bounding box: ${bbox}`);
  console.log("");

  // Check if overturemaps CLI is installed
  try {
    execSync("which overturemaps", { stdio: "pipe", env: execEnv });
  } catch {
    console.error("Error: overturemaps CLI not found");
    console.error("Please install it first: pipx install overturemaps");
    process.exit(1);
  }

  // Download Overture data
  console.log("Downloading Overture Places data...");
  try {
    execSync(
      `overturemaps download --bbox=${bbox} -f geoparquet --type=place -o ${TEMP_FILE}`,
      { stdio: "inherit", env: execEnv }
    );
  } catch (error) {
    console.error("Failed to download Overture data:", error);
    process.exit(1);
  }

  if (!existsSync(TEMP_FILE)) {
    console.error("Download failed: output file not found");
    process.exit(1);
  }

  console.log("");
  console.log("Processing and importing to database...");

  // Check if duckdb is available
  try {
    execSync("duckdb --version", { stdio: "pipe", env: execEnv });
  } catch {
    console.error("Error: duckdb CLI not found");
    console.error("Please install it first: brew install duckdb (or download from duckdb.org)");
    cleanup();
    process.exit(1);
  }

  // Use DuckDB to read parquet and convert to JSON
  let rows: Array<{
    id: string;
    name: string | null;
    category: string;
    subcategory: string | null;
    lat: number;
    lng: number;
    confidence: number | null;
    source: string | null;
  }>;

  try {
    const duckResult = execSync(
      `duckdb -json -c "
        INSTALL spatial;
        LOAD spatial;
        SELECT
          id,
          names.primary as name,
          categories.primary as category,
          categories.alternate[1] as subcategory,
          ST_Y(geometry) as lat,
          ST_X(geometry) as lng,
          confidence,
          sources[1].dataset as source
        FROM '${TEMP_FILE}'
        WHERE categories.primary IS NOT NULL
      "`,
      { maxBuffer: 1024 * 1024 * 500, env: execEnv } // 500MB buffer
    ).toString();

    rows = JSON.parse(duckResult);
  } catch (error) {
    console.error("Failed to process parquet file:", error);
    cleanup();
    process.exit(1);
  }

  console.log(`Found ${rows.length} POIs`);

  if (rows.length === 0) {
    console.log("No POIs found in the specified bounding box");
    cleanup();
    return;
  }

  // Import to database
  const db = getDb();
  const BATCH_SIZE = 1000;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    try {
      await db
        .insert(overturePois)
        .values(
          batch.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            subcategory: r.subcategory,
            lat: r.lat,
            lng: r.lng,
            confidence: r.confidence,
            source: r.source,
          }))
        )
        .onConflictDoNothing();

      imported += batch.length;
    } catch (error) {
      errors += batch.length;
      console.error(`Error importing batch at ${i}:`, error);
    }

    // Progress update
    const progress = Math.round(((i + batch.length) / rows.length) * 100);
    process.stdout.write(
      `\rImported ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (${progress}%)`
    );
  }

  console.log("");
  console.log("");
  console.log("Import complete!");
  console.log(`  Total POIs: ${rows.length}`);
  console.log(`  Imported: ${imported}`);
  if (errors > 0) {
    console.log(`  Errors: ${errors}`);
  }

  cleanup();
}

function cleanup() {
  if (existsSync(TEMP_FILE)) {
    try {
      unlinkSync(TEMP_FILE);
      console.log("Cleaned up temporary files");
    } catch {
      // Ignore cleanup errors
    }
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  cleanup();
  process.exit(1);
});
