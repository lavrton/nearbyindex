CREATE TABLE "vibe_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vibe_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vibe_cache_key_idx" ON "vibe_cache" USING btree ("cache_key");