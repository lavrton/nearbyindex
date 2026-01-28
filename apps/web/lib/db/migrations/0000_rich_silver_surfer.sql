CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(2) NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"population" integer,
	"timezone" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "heat_cells" (
	"id" serial PRIMARY KEY NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"score" integer NOT NULL,
	"grid_step" real DEFAULT 0.01 NOT NULL,
	"city_id" integer,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"city_id" integer,
	"progress" integer DEFAULT 0,
	"total_items" integer,
	"error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "point_score_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"overall" integer NOT NULL,
	"categories" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"endpoint" varchar(100) NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heat_cells" ADD CONSTRAINT "heat_cells_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country");--> statement-breakpoint
CREATE INDEX "cities_coords_idx" ON "cities" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "heat_cells_bounds_idx" ON "heat_cells" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "heat_cells_city_idx" ON "heat_cells" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "heat_cells_coords_step_idx" ON "heat_cells" USING btree ("lat","lng","grid_step");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "jobs_type_idx" ON "jobs" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "point_score_cache_coords_idx" ON "point_score_cache" USING btree ("lat","lng");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_ip_endpoint_window_idx" ON "rate_limits" USING btree ("ip_hash","endpoint","window_start");