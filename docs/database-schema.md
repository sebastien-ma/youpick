# YouPick Database Schema Documentation

## Overview
YouPick uses PostgreSQL as its primary data store, with a single table storing spaces as JSONB documents.

## Database Configuration
- **Schema Name**: `youpick`
- **Primary Table**: `spaces`

## Table: `youpick.spaces`

### Structure
| Column | Type | Description |
|--------|------|-------------|
| `space_id` | VARCHAR(16) | Primary key - First 16 characters of SHA-256 hash of the password |
| `data` | JSONB | Stores all space data (items array and lastPicked object) |
| `created_at` | TIMESTAMP WITH TIME ZONE | Timestamp when the space was first created |
| `last_modified` | TIMESTAMP WITH TIME ZONE | Timestamp of the last modification (auto-updated via trigger) |
| `item_count` | INTEGER (Generated) | Count of items in the space (computed from JSONB) |

### JSONB Data Structure
```json
{
  "items": ["item1", "item2", ...],
  "lastPicked": {
    "item": "string",
    "index": number,
    "timestamp": "ISO8601",
    "space": "partial_space_id"
  } | null
}
```

### Constraints
- `valid_space_id`: Space ID must be exactly 16 characters
- `valid_json_structure`: Data must contain an 'items' array
- `max_items_limit`: Maximum 1000 items per space

### Indexes
- Primary key index on `space_id`
- Timestamp indexes for sorting (`created_at`, `last_modified`)
- GIN index on JSONB data for efficient queries
- Index on `item_count` for filtering

### Triggers
- `update_spaces_last_modified`: Automatically updates `last_modified` timestamp on any row update

## Migration
The database schema is defined in `schema.sql`. To create or recreate the schema:
1. Connect to your PostgreSQL database
2. Execute the SQL commands in `schema.sql`

## Example Queries

### Get a space
```sql
SELECT * FROM youpick.spaces WHERE space_id = '2cf24dba5fb0a30e';
```

### Update items
```sql
UPDATE youpick.spaces
SET data = jsonb_set(data, '{items}', '["Item 1", "Item 2"]'::jsonb)
WHERE space_id = '2cf24dba5fb0a30e';
```

### Update lastPicked
```sql
UPDATE youpick.spaces
SET data = jsonb_set(data, '{lastPicked}',
    '{"item": "Item 1", "index": 0, "timestamp": "2025-11-23T12:00:00Z", "space": "2cf24dba"}'::jsonb)
WHERE space_id = '2cf24dba5fb0a30e';
```

### Find spaces with many items
```sql
SELECT space_id, item_count, created_at
FROM youpick.spaces
WHERE item_count > 5
ORDER BY item_count DESC;
```