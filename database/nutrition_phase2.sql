-- Run manually in Supabase after review. The application remains usable without
-- these optional tables; hydration and medical review requests will be disabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS hydration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml BETWEEN 1 AND 2000),
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    nutrient VARCHAR(80),
    message TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Django API uses the signed astronaut session and a database connection.
-- Deny direct Supabase client access unless separate user-bound policies are added.
ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS hydration_logs_astronaut_logged_idx
    ON hydration_logs (astronaut_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS nutrition_reviews_astronaut_created_idx
    ON nutrition_reviews (astronaut_id, created_at DESC);
