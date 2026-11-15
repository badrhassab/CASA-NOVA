-- =========================================================================
-- NASA ASTRONAUT HEALTH SYSTEM - SUPABASE SCHEMA & SEED DATA
-- Project URL: https://yepykpbpdisfeojfrugb.supabase.co
-- Aligned with NASA Space Apps Challenge & NASA Human Research Program (HRP)
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean existing tables if re-running
DROP TABLE IF EXISTS medical_chat_logs CASCADE;
DROP TABLE IF EXISTS meal_logs CASCADE;
DROP TABLE IF EXISTS daily_nutrition_targets CASCADE;
DROP TABLE IF EXISTS food_inventory CASCADE;
DROP TABLE IF EXISTS health_biometrics CASCADE;
DROP TABLE IF EXISTS eclss_telemetry CASCADE;
DROP TABLE IF EXISTS mission_crew CASCADE;
DROP TABLE IF EXISTS missions CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS astronauts CASCADE;

-- -------------------------------------------------------------------------
-- 1. DESTINATIONS TABLE (Planetary & Celestial Database)
-- Dangers: Gravity Fields, Space Radiation, Distance from Earth
-- -------------------------------------------------------------------------
CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    body_type VARCHAR(50) NOT NULL, -- Planet, Moon, Low Earth Orbit, Deep Space
    surface_gravity_g NUMERIC(5,3) NOT NULL, -- 0.166 for Moon, 0.38 for Mars, 0.00 for ISS
    temperature_min_c NUMERIC(5,1) NOT NULL,
    temperature_max_c NUMERIC(5,1) NOT NULL,
    radiation_environment_msv_yr NUMERIC(6,1) NOT NULL, -- Millisieverts per year
    atmosphere_composition TEXT NOT NULL,
    day_length_hours NUMERIC(6,2) NOT NULL,
    earth_comm_delay_seconds INT NOT NULL, -- Up to 1200s (20 mins) for Mars
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 2. MISSIONS TABLE (Active & Planned Expeditions)
-- -------------------------------------------------------------------------
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    mission_day INT NOT NULL DEFAULT 1,
    current_phase VARCHAR(100) NOT NULL, -- Orbital Insertion, Surface Operations, Transit Cruise
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, planned, completed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 3. ASTRONAUTS TABLE (Profiles, Career Exposure & Baselines)
-- -------------------------------------------------------------------------
CREATE TABLE astronauts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    callsign VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(80) NOT NULL, -- Commander, Flight Surgeon, Mission Specialist, Flight Engineer
    password TEXT, -- Django password hash; never store a clear-text password
    blood_type VARCHAR(10) NOT NULL,
    radiation_accumulated_msv NUMERIC(6,2) NOT NULL DEFAULT 0.00, -- NASA career limit monitoring
    baseline_bone_density_tscore NUMERIC(4,2) NOT NULL DEFAULT 0.00, -- DEXA score
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 4. MISSION_CREW TABLE (Crew Assignment & Operational Roles)
-- -------------------------------------------------------------------------
CREATE TABLE mission_crew (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    crew_role VARCHAR(80) NOT NULL,
    eva_qualified BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(mission_id, astronaut_id)
);

-- -------------------------------------------------------------------------
-- 5. ECLSS_TELEMETRY TABLE (Life Support & Oxygen Systems)
-- Danger: Hostile / Closed Environments
-- -------------------------------------------------------------------------
CREATE TABLE eclss_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    cabin_oxygen_pct NUMERIC(4,2) NOT NULL DEFAULT 20.90, -- Normal: 20.9%
    cabin_oxygen_pp_mmhg NUMERIC(5,1) NOT NULL DEFAULT 158.0, -- Normal: 150-160 mmHg
    cabin_pressure_kpa NUMERIC(5,2) NOT NULL DEFAULT 101.30, -- Normal: 101.3 kPa (14.7 psi)
    co2_scrub_pp_mmhg NUMERIC(4,2) NOT NULL DEFAULT 2.20, -- Elevated risk if > 3.0 mmHg
    suit_oxygen_reserve_pct NUMERIC(4,1) NOT NULL DEFAULT 98.5,
    suit_battery_pct NUMERIC(4,1) NOT NULL DEFAULT 95.0,
    cabin_temp_c NUMERIC(4,1) NOT NULL DEFAULT 21.5,
    status_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- NORMAL, WARNING, CRITICAL
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 6. HEALTH_BIOMETRICS TABLE (Interactive 3D Anatomy & Clinical Readings)
-- Risks: SANS, Immune Dysregulation, Bone Demineralization, Fluid Shifts
-- -------------------------------------------------------------------------
CREATE TABLE health_biometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    body_system VARCHAR(50) NOT NULL, -- NEURO_OPHTHALMIC, CARDIOVASCULAR, MUSCULOSKELETAL, IMMUNE, RESPIRATORY
    heart_rate_bpm INT NOT NULL,
    blood_pressure_sys INT NOT NULL,
    blood_pressure_dia INT NOT NULL,
    intracranial_pressure_est_mmhg NUMERIC(4,1) NOT NULL, -- Normal: 10-15; SANS risk > 18
    optic_disc_edema_grade INT NOT NULL DEFAULT 0, -- Frisén Scale (0 to 4)
    t_cell_activity_index NUMERIC(4,2) NOT NULL, -- Normal: 1.0; Microgravity suppressed < 0.75
    viral_reactivation_flag BOOLEAN NOT NULL DEFAULT FALSE, -- e.g. EBV, VZV latent reactivation
    bone_density_loss_pct NUMERIC(4,2) NOT NULL DEFAULT 0.00, -- Up to 1.5% per month in microgravity
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 7. FOOD_INVENTORY TABLE (Space Food Ration Supply)
-- Categories: Rehydratable, Thermostabilized, Ready-to-eat
-- -------------------------------------------------------------------------
CREATE TABLE food_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_name VARCHAR(120) NOT NULL,
    category VARCHAR(50) NOT NULL, -- REHYDRATABLE, THERMOSTABILIZED, READY_TO_EAT
    calories_kcal INT NOT NULL,
    protein_g NUMERIC(5,1) NOT NULL,
    carbs_g NUMERIC(5,1) NOT NULL,
    fat_g NUMERIC(5,1) NOT NULL,
    sodium_mg NUMERIC(6,1) NOT NULL, -- Low sodium required for SANS prevention
    potassium_mg NUMERIC(6,1) NOT NULL, -- Electrolyte countermeasure
    calcium_mg NUMERIC(6,1) NOT NULL, -- Bone preservation
    vitamin_d_iu NUMERIC(6,1) NOT NULL, -- Immune & bone countermeasure
    water_required_ml INT NOT NULL DEFAULT 0, -- Water needed for rehydration
    stock_quantity INT NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 8. DAILY_NUTRITION_TARGETS TABLE (Individualized Nutritional Baselines)
-- -------------------------------------------------------------------------
CREATE TABLE daily_nutrition_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    target_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_calories_kcal INT NOT NULL DEFAULT 2800,
    target_protein_g NUMERIC(5,1) NOT NULL DEFAULT 110.0,
    target_water_ml INT NOT NULL DEFAULT 2500,
    max_sodium_mg NUMERIC(6,1) NOT NULL DEFAULT 2200.0,
    target_calcium_mg NUMERIC(6,1) NOT NULL DEFAULT 1200.0,
    target_vitamin_d_iu NUMERIC(6,1) NOT NULL DEFAULT 1000.0,
    is_eva_day BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(astronaut_id, target_date)
);

-- -------------------------------------------------------------------------
-- 9. MEAL_LOGS TABLE (Consumed Meals & Real-time Contribution)
-- -------------------------------------------------------------------------
CREATE TABLE meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES food_inventory(id) ON DELETE CASCADE,
    portion_size NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    meal_type VARCHAR(30) NOT NULL, -- BREAKFAST, LUNCH, DINNER, EVA_SNACK
    water_consumed_ml INT NOT NULL DEFAULT 250,
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 10. MEDICAL_CHAT_LOGS TABLE (Autonomous AI Symptom Checker - NASA CDSS)
-- Hazards: Space Radiation, Isolation, Distance, Gravity, Hostile Environment
-- -------------------------------------------------------------------------
CREATE TABLE medical_chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astronaut_id UUID NOT NULL REFERENCES astronauts(id) ON DELETE CASCADE,
    session_id UUID DEFAULT uuid_generate_v4(),
    sender VARCHAR(30) NOT NULL, -- ASTRONAUT, AI_FLIGHT_SURGEON
    message_text TEXT NOT NULL,
    hrp_hazard_tag VARCHAR(50), -- RADIATION, ISOLATION, DISTANCE, GRAVITY, ENVIRONMENT
    triage_level VARCHAR(20) DEFAULT 'ROUTINE', -- ROUTINE, EVALUATE, URGENT
    suggested_countermeasure TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Allows read and write for the hackathon application
-- -------------------------------------------------------------------------
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE astronauts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE eclss_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read destinations" ON destinations FOR SELECT USING (true);
CREATE POLICY "Allow public write destinations" ON destinations FOR ALL USING (true);

CREATE POLICY "Allow public read missions" ON missions FOR SELECT USING (true);
CREATE POLICY "Allow public write missions" ON missions FOR ALL USING (true);

CREATE POLICY "Allow public read astronauts" ON astronauts FOR SELECT USING (true);
CREATE POLICY "Allow public write astronauts" ON astronauts FOR ALL USING (true);

CREATE POLICY "Allow public read mission_crew" ON mission_crew FOR SELECT USING (true);
CREATE POLICY "Allow public write mission_crew" ON mission_crew FOR ALL USING (true);

CREATE POLICY "Allow public read eclss" ON eclss_telemetry FOR SELECT USING (true);
CREATE POLICY "Allow public write eclss" ON eclss_telemetry FOR ALL USING (true);

CREATE POLICY "Allow public read biometrics" ON health_biometrics FOR SELECT USING (true);
CREATE POLICY "Allow public write biometrics" ON health_biometrics FOR ALL USING (true);

CREATE POLICY "Allow public read food" ON food_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public write food" ON food_inventory FOR ALL USING (true);

CREATE POLICY "Allow public read targets" ON daily_nutrition_targets FOR SELECT USING (true);
CREATE POLICY "Allow public write targets" ON daily_nutrition_targets FOR ALL USING (true);

CREATE POLICY "Allow public read meals" ON meal_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write meals" ON meal_logs FOR ALL USING (true);

CREATE POLICY "Allow public read chat" ON medical_chat_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write chat" ON medical_chat_logs FOR ALL USING (true);

-- =========================================================================
-- SEED DATA - REALISTIC NASA SCIENTIFIC & CLINICAL SCENARIOS
-- =========================================================================

-- Destinations
INSERT INTO destinations (id, name, body_type, surface_gravity_g, temperature_min_c, temperature_max_c, radiation_environment_msv_yr, atmosphere_composition, day_length_hours, earth_comm_delay_seconds)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Moon - Shackleton Crater (Artemis Base)', 'Moon', 0.166, -246.0, 120.0, 150.0, 'Hard Vacuum (Traces of He, Ne, H2)', 708.0, 1),
('22222222-2222-2222-2222-222222222222', 'Mars - Jezero Crater Habitat', 'Planet', 0.380, -125.0, 20.0, 250.0, '95.3% CO2, 2.6% N2, 1.9% Ar, 0.13% O2', 24.66, 780),
('33333333-3333-3333-3333-333333333333', 'International Space Station (LEO)', 'Low Earth Orbit', 0.000, -157.0, 121.0, 75.0, '78.0% N2, 21.0% O2, 0.9% Ar (101.3 kPa)', 1.50, 0);

-- Missions
INSERT INTO missions (id, mission_code, name, destination_id, start_date, end_date, mission_day, current_phase, progress_percent, status)
VALUES
('44444444-4444-4444-4444-444444444444', 'ARTEMIS-III', 'Artemis Polar Expedition III', '11111111-1111-1111-1111-111111111111', '2026-09-15', '2026-10-15', 28, 'Lunar Surface EVAs & Geological Survey', 72.5, 'active'),
('55555555-5555-5555-5555-555555555555', 'ARES-V', 'Mars Deep Space Transit Expedition', '22222222-2222-2222-2222-222222222222', '2027-04-01', '2029-11-20', 142, 'Heliocentric Interplanetary Cruise', 24.0, 'planned');

-- Predefined Astronauts
INSERT INTO astronauts (id, full_name, callsign, email, role, blood_type, radiation_accumulated_msv, baseline_bone_density_tscore, avatar_url)
VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'Dr. Jessica Watkins', 'Valkyrie', 'jessica.watkins@nasa.gov', 'Mission Commander & Geologist', 'O+', 42.8, 1.15, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'Dr. Jonny Kim', 'Doc-Eagle', 'jonny.kim@nasa.gov', 'Flight Surgeon & EVA Lead', 'A+', 38.4, 1.30, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'),
('cccc3333-cccc-3333-cccc-333333333333', 'Kjell Lindgren', 'Astro-Kjell', 'kjell.lindgren@nasa.gov', 'Flight Engineer & ECLSS Specialist', 'B+', 61.2, 0.95, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80');

-- Crew Assignments
INSERT INTO mission_crew (mission_id, astronaut_id, crew_role, eva_qualified)
VALUES
('44444444-4444-4444-4444-444444444444', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'Mission Commander', TRUE),
('44444444-4444-4444-4444-444444444444', 'bbbb2222-bbbb-2222-bbbb-222222222222', 'Chief Medical Officer / EVA Lead', TRUE),
('44444444-4444-4444-4444-444444444444', 'cccc3333-cccc-3333-cccc-333333333333', 'Life Support Systems Engineer', TRUE);

-- ECLSS Telemetry for Active Mission
INSERT INTO eclss_telemetry (mission_id, cabin_oxygen_pct, cabin_oxygen_pp_mmhg, cabin_pressure_kpa, co2_scrub_pp_mmhg, suit_oxygen_reserve_pct, suit_battery_pct, cabin_temp_c, status_level)
VALUES
('44444444-4444-4444-4444-444444444444', 21.05, 159.2, 101.32, 2.35, 96.4, 94.0, 21.8, 'NORMAL');

-- Clinical Biometrics (HRP Anatomy Focus)
INSERT INTO health_biometrics (astronaut_id, body_system, heart_rate_bpm, blood_pressure_sys, blood_pressure_dia, intracranial_pressure_est_mmhg, optic_disc_edema_grade, t_cell_activity_index, viral_reactivation_flag, bone_density_loss_pct, notes)
VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'NEURO_OPHTHALMIC', 68, 118, 76, 14.2, 1, 0.88, FALSE, 0.45, 'SANS Grade 1 early Frisén border blurring observed. Visual acuity preserved.'),
('aaaa1111-aaaa-1111-aaaa-111111111111', 'IMMUNE', 68, 118, 76, 14.2, 0, 0.82, FALSE, 0.45, 'Mild reduction in CD8+ T-cell blastogenesis. Anti-oxidant regimen compliant.'),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'CARDIOVASCULAR', 62, 112, 70, 12.8, 0, 0.94, FALSE, 0.30, 'Normal left ventricular contractility. Zero orthostatic signs post-CEVIS exercise.');

-- Food Inventory (NASA Standard Rations)
INSERT INTO food_inventory (id, item_name, category, calories_kcal, protein_g, carbs_g, fat_g, sodium_mg, potassium_mg, calcium_mg, vitamin_d_iu, water_required_ml, stock_quantity)
VALUES
('f1111111-1111-1111-1111-111111111111', 'Freeze-Dried Teriyaki Chicken & Rice', 'REHYDRATABLE', 460, 34.0, 52.0, 11.0, 480.0, 620.0, 110.0, 150.0, 220, 84),
('f2222222-2222-2222-2222-222222222222', 'Thermostabilized Beef Pot Roast & Veggies', 'THERMOSTABILIZED', 380, 29.0, 18.0, 16.0, 410.0, 580.0, 85.0, 120.0, 0, 65),
('f3333333-3333-3333-3333-333333333333', 'Organic Almond & Cranberry Mix', 'READY_TO_EAT', 290, 8.5, 26.0, 18.0, 95.0, 310.0, 160.0, 80.0, 0, 120),
('f4444444-4444-4444-4444-444444444444', 'Dehydrated Scrambled Eggs with Spinach', 'REHYDRATABLE', 320, 24.0, 6.0, 21.0, 390.0, 450.0, 280.0, 400.0, 150, 92),
('f5555555-5555-5555-5555-555555555555', 'Omega-3 Fortified Wild Salmon Pouch', 'THERMOSTABILIZED', 310, 32.0, 2.0, 19.0, 380.0, 520.0, 190.0, 650.0, 0, 78),
('f6666666-6666-6666-6666-666666666666', 'Whole Wheat Astronaut Tortillas (6-pack)', 'READY_TO_EAT', 240, 7.0, 42.0, 4.0, 210.0, 140.0, 120.0, 0.0, 0, 145);

-- Daily Nutrition Target for Commander
INSERT INTO daily_nutrition_targets (astronaut_id, target_date, target_calories_kcal, target_protein_g, target_water_ml, max_sodium_mg, target_calcium_mg, target_vitamin_d_iu, is_eva_day)
VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', CURRENT_DATE, 3100, 125.0, 2800, 2000.0, 1300.0, 1000.0, TRUE);

-- Sample Logged Meals for Today
INSERT INTO meal_logs (astronaut_id, food_id, portion_size, meal_type, water_consumed_ml)
VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'f4444444-4444-4444-4444-444444444444', 1.0, 'BREAKFAST', 400),
('aaaa1111-aaaa-1111-aaaa-111111111111', 'f1111111-1111-1111-1111-111111111111', 1.0, 'LUNCH', 500);

-- Medical Chat Logs (Diagnostic Dialogues based on NASA HRP)
INSERT INTO medical_chat_logs (astronaut_id, sender, message_text, hrp_hazard_tag, triage_level, suggested_countermeasure)
VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'ASTRONAUT', 'J''ai remarqué un léger flou visuel de près en lisant les check-lists de l''atterrisseur, et une légère sensation de pression derrière les yeux.', 'GRAVITY', 'EVALUATE', NULL),
('aaaa1111-aaaa-1111-aaaa-111111111111', 'AI_FLIGHT_SURGEON', 'Reçu Commandant. Ces symptômes sont caractéristiques du SANS (Spaceflight-Associated Neuro-ocular Syndrome) causé par le déplacement céphalique des fluides en microgravité. Protocole recommandé : 1. Effectuer une échographie oculaire OCT du nerf optique. 2. Programmer 60 min de LBNP (Lower Body Negative Pressure) à -35 mmHg. 3. Limiter l''apport sodique sous 2000 mg pour éviter la rétention hydrique.', 'GRAVITY', 'EVALUATE', 'LBNP 60min (-35 mmHg) + Fond d''œil OCT + Régime hypocalorique en sodium (<2000mg)');
