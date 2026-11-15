-- Run once in the Supabase SQL Editor for an existing project.
-- The application stores Django password hashes in this column, never clear text.
ALTER TABLE astronauts ADD COLUMN IF NOT EXISTS password TEXT;
