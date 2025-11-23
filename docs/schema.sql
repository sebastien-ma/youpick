-- YouPick Database Schema
-- This DDL creates the space table in the youpick schema
-- Each space (namespace) is stored as a single row with JSON data

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS youpick;

-- Set search path to use our schema
SET search_path TO youpick, public;

-- Drop existing table if needed (be careful with this in production!)
-- DROP TABLE IF EXISTS youpick.spaces CASCADE;

-- Create the spaces table
CREATE TABLE IF NOT EXISTS youpick.spaces (
    -- Primary key: space_id (hashed password, first 16 chars of SHA-256)
    space_id VARCHAR(16) PRIMARY KEY,

    -- JSON column storing all space data
    -- Structure: {
    --   "items": ["item1", "item2", ...],
    --   "lastPicked": {
    --     "item": "string",
    --     "index": number,
    --     "timestamp": "ISO8601",
    --     "space": "partial_space_id"
    --   } | null
    -- }
    data JSONB NOT NULL DEFAULT '{"items": [], "lastPicked": null}'::jsonb,

    -- Metadata fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Additional indexing for performance
    -- Number of items (extracted from JSON for faster queries)
    item_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(data->'items')) STORED,

    -- Constraints
    CONSTRAINT valid_space_id CHECK (LENGTH(space_id) = 16),
    CONSTRAINT valid_json_structure CHECK (
        data ? 'items' AND
        jsonb_typeof(data->'items') = 'array'
    ),
    CONSTRAINT max_items_limit CHECK (
        jsonb_array_length(data->'items') <= 1000
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spaces_last_modified
    ON youpick.spaces(last_modified DESC);

CREATE INDEX IF NOT EXISTS idx_spaces_created_at
    ON youpick.spaces(created_at DESC);

-- GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_spaces_data_gin
    ON youpick.spaces USING gin(data);

-- Index for item count queries
CREATE INDEX IF NOT EXISTS idx_spaces_item_count
    ON youpick.spaces(item_count);

-- Create a trigger to automatically update last_modified timestamp
CREATE OR REPLACE FUNCTION youpick.update_last_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_spaces_last_modified ON youpick.spaces;

-- Create the trigger
CREATE TRIGGER update_spaces_last_modified
    BEFORE UPDATE ON youpick.spaces
    FOR EACH ROW
    EXECUTE FUNCTION youpick.update_last_modified();

-- Comments for documentation
COMMENT ON TABLE youpick.spaces IS 'Stores each space as a row with JSON data containing items and last picked information';
COMMENT ON COLUMN youpick.spaces.space_id IS 'First 16 characters of SHA-256 hash of the password';
COMMENT ON COLUMN youpick.spaces.data IS 'JSON object containing items array and lastPicked object';
COMMENT ON COLUMN youpick.spaces.item_count IS 'Generated column: count of items in the items array';
COMMENT ON COLUMN youpick.spaces.created_at IS 'Timestamp when the space was first created';
COMMENT ON COLUMN youpick.spaces.last_modified IS 'Timestamp of the last modification (automatically updated)';

-- Sample queries for reference:
/*
-- Insert a new space
INSERT INTO youpick.spaces (space_id, data)
VALUES ('2cf24dba5fb0a30e', '{"items": ["Item 1", "Item 2"], "lastPicked": null}'::jsonb);

-- Get a space
SELECT * FROM youpick.spaces WHERE space_id = '2cf24dba5fb0a30e';

-- Update items in a space
UPDATE youpick.spaces
SET data = jsonb_set(data, '{items}', '["New Item 1", "New Item 2"]'::jsonb)
WHERE space_id = '2cf24dba5fb0a30e';

-- Update lastPicked
UPDATE youpick.spaces
SET data = jsonb_set(data, '{lastPicked}',
    '{"item": "Item 1", "index": 0, "timestamp": "2025-11-23T12:00:00Z", "space": "2cf24dba"}'::jsonb)
WHERE space_id = '2cf24dba5fb0a30e';

-- Get all spaces with more than 5 items
SELECT space_id, item_count, created_at
FROM youpick.spaces
WHERE item_count > 5;

-- Delete a space
DELETE FROM youpick.spaces WHERE space_id = '2cf24dba5fb0a30e';
*/