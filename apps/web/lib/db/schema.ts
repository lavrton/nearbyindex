import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  real,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

// Cities table - stores city metadata for SEO pages
export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    country: varchar("country", { length: 2 }).notNull(), // ISO country code
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    // Bounding box for city area
    minLat: real("min_lat"),
    maxLat: real("max_lat"),
    minLng: real("min_lng"),
    maxLng: real("max_lng"),
    population: integer("population"),
    timezone: varchar("timezone", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cities_country_idx").on(table.country),
    index("cities_coords_idx").on(table.lat, table.lng),
  ]
);

// Point score cache - caches computed scores for individual points
export const pointScoreCache = pgTable(
  "point_score_cache",
  {
    id: serial("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    overall: integer("overall").notNull(),
    categories: jsonb("categories").notNull(), // CategoryScoreResult[]
    computedAt: timestamp("computed_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    // Use a grid-based index for efficient lookups
    // Rounds to ~100m precision for cache hits
    uniqueIndex("point_score_cache_coords_idx").on(table.lat, table.lng),
  ]
);

// Heat cells - precomputed heatmap data for visualization
export const heatCells = pgTable(
  "heat_cells",
  {
    id: serial("id").primaryKey(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    score: integer("score").notNull(), // Grocery-only score for MVP
    gridStep: real("grid_step").notNull().default(0.01), // Grid resolution in degrees
    cityId: integer("city_id").references(() => cities.id),
    computedAt: timestamp("computed_at").defaultNow().notNull(),
  },
  (table) => [
    index("heat_cells_bounds_idx").on(table.lat, table.lng),
    index("heat_cells_city_idx").on(table.cityId),
    // Unique constraint includes gridStep to support multiple resolutions
    uniqueIndex("heat_cells_coords_step_idx").on(table.lat, table.lng, table.gridStep),
  ]
);

// Jobs table - tracks background computation jobs
export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 50 }).notNull(), // 'heatmap_compute', 'cache_refresh'
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, running, completed, failed
    cityId: integer("city_id").references(() => cities.id),
    progress: integer("progress").default(0),
    totalItems: integer("total_items"),
    error: text("error"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("jobs_status_idx").on(table.status),
    index("jobs_type_idx").on(table.type),
  ]
);

// Overture POIs table - stores POI data from Overture Maps
export const overturePois = pgTable(
  "overture_pois",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    category: text("category").notNull(),       // "grocery", "restaurant", etc.
    subcategory: text("subcategory"),           // "supermarket", "convenience", etc.
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    confidence: real("confidence"),
    source: text("source"),                     // "meta", "microsoft", "osm"
    tags: jsonb("tags"),                        // Additional metadata
    importedAt: timestamp("imported_at").defaultNow(),
  },
  (table) => [
    index("overture_pois_location_idx").on(table.lat, table.lng),
    index("overture_pois_category_idx").on(table.category),
    index("overture_pois_category_location_idx").on(table.category, table.lat, table.lng),
  ]
);

// Rate limiting table - tracks API usage per IP
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    endpoint: varchar("endpoint", { length: 100 }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    windowStart: timestamp("window_start").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rate_limits_ip_endpoint_window_idx").on(
      table.ipHash,
      table.endpoint,
      table.windowStart
    ),
  ]
);

// Type exports
export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;

export type PointScoreCache = typeof pointScoreCache.$inferSelect;
export type NewPointScoreCache = typeof pointScoreCache.$inferInsert;

export type HeatCell = typeof heatCells.$inferSelect;
export type NewHeatCell = typeof heatCells.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;

export type OverturePoi = typeof overturePois.$inferSelect;
export type NewOverturePoi = typeof overturePois.$inferInsert;
