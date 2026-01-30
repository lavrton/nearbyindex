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
 *   - Downloads in tiles (60x60 degrees each) for reliability
 *   - Each tile: ~200MB-1GB, total ~8-10GB
 *   - Database size: ~15-20GB
 *   - Safe to kill/restart - completed tiles are skipped
 *
 * Resumability:
 *   - Completed tile files are kept and skipped on restart
 *   - Database import uses onConflictDoNothing (safe to restart)
 *   - Use --cleanup to delete all temp files
 *
 * Environment variables:
 *   DATABASE_URL - Required
 */

// Load .env.local for local development
import { config } from "dotenv";
config({ path: ".env.local" });

import { execSync } from "child_process";
import { existsSync, unlinkSync, statSync, readdirSync } from "fs";
import { homedir } from "os";
import { getDb } from "../lib/db/client";
import { overturePois } from "../lib/db/schema";

const TEMP_DIR = "/tmp/overture_tiles";
const QUERY_BATCH_SIZE = 100000; // Rows to fetch from DuckDB at a time
const INSERT_BATCH_SIZE = 1000; // Rows to insert into DB at a time

// Tile size in degrees (60x60 = 18 tiles for world coverage)
const TILE_SIZE = 60;

// Extend PATH to include common pipx/homebrew locations
const EXTENDED_PATH = [
  `${homedir()}/.local/bin`,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  process.env.PATH,
].join(":");

const execEnv = { ...process.env, PATH: EXTENDED_PATH };

type Tile = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  name: string;
  file: string;
};

// Parse command line arguments
function parseArgs(): { bbox: string; cleanup: boolean } {
  const args = process.argv.slice(2);
  const bboxArg = args.find((a) => a.startsWith("--bbox="));
  const cleanup = args.includes("--cleanup");

  // Default: world
  const bbox = bboxArg ? bboxArg.replace("--bbox=", "") : "-180,-90,180,90";

  return { bbox, cleanup };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// Generate tiles for a bounding box
function generateTiles(bbox: string): Tile[] {
  const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
  const tiles: Tile[] = [];

  // If bbox is small enough, use single tile
  if (maxLng - minLng <= TILE_SIZE && maxLat - minLat <= TILE_SIZE) {
    const name = `${minLng}_${minLat}_${maxLng}_${maxLat}`;
    return [
      {
        minLng,
        minLat,
        maxLng,
        maxLat,
        name,
        file: `${TEMP_DIR}/tile_${name}.parquet`,
      },
    ];
  }

  // Generate grid of tiles
  for (let lng = minLng; lng < maxLng; lng += TILE_SIZE) {
    for (let lat = minLat; lat < maxLat; lat += TILE_SIZE) {
      const tileMaxLng = Math.min(lng + TILE_SIZE, maxLng);
      const tileMaxLat = Math.min(lat + TILE_SIZE, maxLat);
      const name = `${lng}_${lat}_${tileMaxLng}_${tileMaxLat}`;

      tiles.push({
        minLng: lng,
        minLat: lat,
        maxLng: tileMaxLng,
        maxLat: tileMaxLat,
        name,
        file: `${TEMP_DIR}/tile_${name}.parquet`,
      });
    }
  }

  return tiles;
}

type POIRow = {
  id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  lat: number;
  lng: number;
  confidence: number | null;
  source: string | null;
};

async function processTile(tile: Tile, db: ReturnType<typeof getDb>): Promise<{ imported: number; errors: number }> {
  let totalImported = 0;
  let totalErrors = 0;

  // Count POIs in tile
  let totalCount: number;
  try {
    const countResult = execSync(
      `duckdb -json -c "
        SELECT COUNT(*) as count
        FROM '${tile.file}'
        WHERE categories.primary IS NOT NULL
      "`,
      { env: execEnv }
    ).toString();

    totalCount = JSON.parse(countResult)[0].count;
  } catch (error) {
    console.error(`  Failed to count POIs:`, error);
    return { imported: 0, errors: 0 };
  }

  if (totalCount === 0) {
    console.log(`  No POIs in this tile`);
    return { imported: 0, errors: 0 };
  }

  console.log(`  POIs to import: ${formatNumber(totalCount)}`);

  let offset = 0;
  const startTime = Date.now();

  while (offset < totalCount) {
    let rows: POIRow[];

    try {
      const duckResult = execSync(
        `duckdb -json -c "
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
          FROM '${tile.file}'
          WHERE categories.primary IS NOT NULL
          LIMIT ${QUERY_BATCH_SIZE}
          OFFSET ${offset}
        "`,
        { maxBuffer: 1024 * 1024 * 200, env: execEnv }
      ).toString();

      rows = JSON.parse(duckResult);
    } catch (error) {
      console.error(`\n  Failed to fetch batch at offset ${offset}:`, error);
      return { imported: totalImported, errors: totalErrors };
    }

    if (rows.length === 0) break;

    // Insert into database
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + INSERT_BATCH_SIZE);

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

        totalImported += batch.length;
      } catch (error) {
        totalErrors += batch.length;
      }
    }

    offset += rows.length;

    // Progress update
    const progress = Math.round((offset / totalCount) * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? Math.round(offset / elapsed) : 0;

    process.stdout.write(
      `\r  Progress: ${formatNumber(offset)}/${formatNumber(totalCount)} (${progress}%) | ${formatNumber(rate)} rows/sec   `
    );
  }

  console.log(""); // New line after progress

  return { imported: totalImported, errors: totalErrors };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const { bbox, cleanup: cleanupFlag } = parseArgs();

  console.log("Overture POI Setup (Tile-based)");
  console.log("================================");
  console.log(`Bounding box: ${bbox}`);
  console.log("");

  // Handle --cleanup flag
  if (cleanupFlag) {
    if (existsSync(TEMP_DIR)) {
      const files = readdirSync(TEMP_DIR);
      for (const file of files) {
        unlinkSync(`${TEMP_DIR}/${file}`);
      }
      execSync(`rmdir ${TEMP_DIR}`, { stdio: "pipe" });
      console.log(`Deleted ${files.length} tile files and temp directory`);
    } else {
      console.log("No temp files to clean up");
    }
    return;
  }

  // Check prerequisites
  try {
    execSync("which overturemaps", { stdio: "pipe", env: execEnv });
  } catch {
    console.error("Error: overturemaps CLI not found");
    console.error("Please install it first: pipx install overturemaps");
    process.exit(1);
  }

  try {
    execSync("duckdb --version", { stdio: "pipe", env: execEnv });
  } catch {
    console.error("Error: duckdb CLI not found");
    console.error("Please install it first: brew install duckdb");
    process.exit(1);
  }

  // Create temp directory
  if (!existsSync(TEMP_DIR)) {
    execSync(`mkdir -p ${TEMP_DIR}`, { stdio: "pipe" });
  }

  // Install spatial extension once
  console.log("Installing DuckDB spatial extension...");
  try {
    execSync(`duckdb -c "INSTALL spatial; LOAD spatial;"`, { stdio: "pipe", env: execEnv });
  } catch (error) {
    console.error("Failed to install spatial extension:", error);
    process.exit(1);
  }

  // Generate tiles
  const tiles = generateTiles(bbox);
  console.log(`Split into ${tiles.length} tile(s)`);
  console.log("");

  const db = getDb();
  let grandTotalImported = 0;
  let grandTotalErrors = 0;
  const overallStart = Date.now();

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    const tileBbox = `${tile.minLng},${tile.minLat},${tile.maxLng},${tile.maxLat}`;

    console.log(`\nTile ${i + 1}/${tiles.length}: ${tileBbox}`);
    console.log("-".repeat(50));

    // Step 1: Download tile (skip if exists)
    if (existsSync(tile.file)) {
      const stats = statSync(tile.file);
      console.log(`  Already downloaded: ${formatBytes(stats.size)}`);
    } else {
      console.log(`  Downloading...`);
      try {
        execSync(
          `overturemaps download --bbox=${tileBbox} -f geoparquet --type=place -o ${tile.file}`,
          { stdio: "inherit", env: execEnv }
        );

        if (!existsSync(tile.file)) {
          console.log(`  Download failed - skipping tile`);
          continue;
        }

        const stats = statSync(tile.file);
        console.log(`  Downloaded: ${formatBytes(stats.size)}`);
      } catch (error) {
        console.error(`  Download failed:`, error);
        continue;
      }
    }

    // Step 2: Process and import tile
    const { imported, errors } = await processTile(tile, db);
    grandTotalImported += imported;
    grandTotalErrors += errors;

    console.log(`  Tile complete: ${formatNumber(imported)} imported${errors > 0 ? `, ${errors} errors` : ""}`);
  }

  const totalTime = Math.round((Date.now() - overallStart) / 1000);

  console.log("");
  console.log("=".repeat(50));
  console.log("All tiles complete!");
  console.log(`  Total imported: ${formatNumber(grandTotalImported)}`);
  if (grandTotalErrors > 0) {
    console.log(`  Total errors: ${formatNumber(grandTotalErrors)}`);
  }
  console.log(`  Total time: ${totalTime}s`);
  console.log("");
  console.log(`Tile files kept in: ${TEMP_DIR}`);
  console.log("Run with --cleanup to delete them");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
