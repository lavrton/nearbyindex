import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy-initialized database connection
// This allows environment variables to be loaded before the connection is established
let _db: PostgresJsDatabase<typeof schema> | null = null;

function initDb(): PostgresJsDatabase<typeof schema> | null {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  _db = drizzle(client, { schema });
  return _db;
}

// For backwards compatibility - lazily initialized
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    const instance = initDb();
    if (!instance) {
      throw new Error("Database not configured. Set DATABASE_URL environment variable.");
    }
    return (instance as Record<string | symbol, unknown>)[prop];
  },
});

export function getDb() {
  const instance = initDb();
  if (!instance) {
    throw new Error("Database not configured. Set DATABASE_URL environment variable.");
  }
  return instance;
}

// Helper to check if DB is available
export function isDbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
