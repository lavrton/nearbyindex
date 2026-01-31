import { config } from "dotenv";
// Use production database if --prod flag is passed
const envFile = process.argv.includes("--prod") ? ".env.production.local" : ".env.local";
config({ path: envFile });
console.log(`Using env file: ${envFile}`);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { heatCells } from "../lib/db/schema";
import { and, gte, lte, sql } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Cancun full bounds (from bounds.ts)
const CANCUN_BOUNDS = { minLat: 20.8, maxLat: 21.4, minLng: -87.2, maxLng: -86.5 };

interface ScoreStats {
  total: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  percentiles: Record<string, number>;
  histogram: Record<string, number>;
}

function calculatePercentile(sortedScores: number[], p: number): number {
  const index = Math.ceil((p / 100) * sortedScores.length) - 1;
  return sortedScores[Math.max(0, index)];
}

function generateHistogram(scores: number[], bucketSize: number = 5): Record<string, number> {
  const histogram: Record<string, number> = {};

  // Initialize buckets from 30 to 100
  for (let i = 30; i < 100; i += bucketSize) {
    const key = `${i}-${i + bucketSize - 1}`;
    histogram[key] = 0;
  }

  for (const score of scores) {
    const bucketStart = Math.floor(score / bucketSize) * bucketSize;
    const key = `${bucketStart}-${bucketStart + bucketSize - 1}`;
    if (histogram[key] !== undefined) {
      histogram[key]++;
    }
  }

  return histogram;
}

function renderHistogramBar(count: number, total: number, maxWidth: number = 40): string {
  const percentage = (count / total) * 100;
  const barLength = Math.round((count / total) * maxWidth);
  const bar = "█".repeat(barLength);
  return `${bar} ${count} (${percentage.toFixed(1)}%)`;
}

async function analyzeScoreDistribution(): Promise<void> {
  console.log("=== CANCUN HEATMAP SCORE DISTRIBUTION ===\n");
  console.log(`Bounds: lat ${CANCUN_BOUNDS.minLat}-${CANCUN_BOUNDS.maxLat}, lng ${CANCUN_BOUNDS.minLng}-${CANCUN_BOUNDS.maxLng}\n`);

  // Fetch all scores for Cancun
  const results = await db
    .select({
      score: heatCells.score,
    })
    .from(heatCells)
    .where(
      and(
        gte(heatCells.lat, CANCUN_BOUNDS.minLat),
        lte(heatCells.lat, CANCUN_BOUNDS.maxLat),
        gte(heatCells.lng, CANCUN_BOUNDS.minLng),
        lte(heatCells.lng, CANCUN_BOUNDS.maxLng),
        gte(heatCells.score, 30) // Only visible cells
      )
    );

  if (results.length === 0) {
    console.log("No heatmap cells found for Cancun!");
    console.log("Run the heatmap computation job first.");
    await client.end();
    return;
  }

  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const total = scores.length;

  // Basic stats
  const min = scores[0];
  const max = scores[scores.length - 1];
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / total;
  const median = calculatePercentile(scores, 50);

  console.log(`Total visible cells: ${total.toLocaleString()}`);
  console.log(`Score range: ${min} - ${max}`);
  console.log(`Mean: ${mean.toFixed(1)} | Median: ${median}`);

  // Percentiles
  console.log("\n--- Percentiles ---");
  const percentileValues = [10, 25, 50, 75, 90, 95, 99];
  const percentiles: Record<string, number> = {};

  for (const p of percentileValues) {
    percentiles[`p${p}`] = calculatePercentile(scores, p);
  }

  console.log(
    `p10: ${percentiles.p10} | p25: ${percentiles.p25} | p50: ${percentiles.p50} | p75: ${percentiles.p75} | p90: ${percentiles.p90} | p95: ${percentiles.p95} | p99: ${percentiles.p99}`
  );

  // Histogram
  console.log("\n--- Histogram (bucket size: 5) ---");
  const histogram = generateHistogram(scores, 5);

  for (const [bucket, count] of Object.entries(histogram)) {
    if (count > 0) {
      console.log(`  ${bucket.padStart(6)}: ${renderHistogramBar(count, total)}`);
    }
  }

  // Color tier distribution (based on current scoreToColor thresholds)
  console.log("\n--- Current Color Tier Distribution ---");
  const colorTiers = [
    { name: "Yellow (30-44)", min: 30, max: 44 },
    { name: "Lime (45-59)", min: 45, max: 59 },
    { name: "Green 400 (60-69)", min: 60, max: 69 },
    { name: "Green 500 (70-77)", min: 70, max: 77 },
    { name: "Green 600 (78-84)", min: 78, max: 84 },
    { name: "Green 700 (85-91)", min: 85, max: 91 },
    { name: "Green 800 (92-96)", min: 92, max: 96 },
    { name: "Green 900 (97+)", min: 97, max: 100 },
  ];

  for (const tier of colorTiers) {
    const count = scores.filter((s) => s >= tier.min && s <= tier.max).length;
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${tier.name.padEnd(22)}: ${count.toLocaleString().padStart(7)} cells (${pct}%)`);
  }

  // Analysis summary
  console.log("\n--- Analysis ---");
  const above78 = scores.filter((s) => s >= 78).length;
  const above78Pct = ((above78 / total) * 100).toFixed(1);
  console.log(`Cells scoring 78+ (dark green tiers): ${above78.toLocaleString()} (${above78Pct}%)`);

  if (parseFloat(above78Pct) > 50) {
    console.log("⚠️  More than half of visible cells are in dark green tiers!");
    console.log("   Recommendation: Consider steeper score compression or expanded palette.");
  }

  const above85 = scores.filter((s) => s >= 85).length;
  const above85Pct = ((above85 / total) * 100).toFixed(1);
  console.log(`Cells scoring 85+ (very dark green): ${above85.toLocaleString()} (${above85Pct}%)`);

  // Detailed breakdown of high scores
  console.log("\n--- High Score Breakdown (95-100) ---");
  for (let s = 95; s <= 100; s++) {
    const count = scores.filter((x) => x === s).length;
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  Score ${s}: ${count.toLocaleString().padStart(6)} cells (${pct}%)`);
  }

  const exactly100 = scores.filter((s) => s === 100).length;
  console.log(`\n⚠️  ${exactly100} cells (${((exactly100 / total) * 100).toFixed(1)}%) hit exactly 100 (max score)`);

  await client.end();
}

analyzeScoreDistribution().catch(console.error);
