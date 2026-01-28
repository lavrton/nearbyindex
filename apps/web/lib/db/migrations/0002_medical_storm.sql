CREATE TABLE "overture_pois" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"category" text NOT NULL,
	"subcategory" text,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"confidence" real,
	"source" text,
	"tags" jsonb,
	"imported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "overture_pois_location_idx" ON "overture_pois" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "overture_pois_category_idx" ON "overture_pois" USING btree ("category");--> statement-breakpoint
CREATE INDEX "overture_pois_category_location_idx" ON "overture_pois" USING btree ("category","lat","lng");