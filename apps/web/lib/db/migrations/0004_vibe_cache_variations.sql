-- Add variation_index column to support multiple vibe variations per cache key
ALTER TABLE vibe_cache ADD COLUMN variation_index INTEGER NOT NULL DEFAULT 0;

-- Drop old unique constraint on cache_key
DROP INDEX IF EXISTS vibe_cache_key_idx;
DROP INDEX IF EXISTS vibe_cache_cache_key_unique;

-- Add composite unique constraint on cache_key + variation_index
CREATE UNIQUE INDEX vibe_cache_key_variation_idx ON vibe_cache(cache_key, variation_index);

-- Add index for lookups by cache_key
CREATE INDEX vibe_cache_key_idx ON vibe_cache(cache_key);
