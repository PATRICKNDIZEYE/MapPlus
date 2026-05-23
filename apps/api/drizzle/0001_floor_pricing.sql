-- Add per-m² lease rate to floors
ALTER TABLE floors
  ADD COLUMN IF NOT EXISTS price_per_sqm NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'RWF';

-- Seed default rates for CHIC Kigali pilot.
-- Ground floor commands the highest rate; rates step down per floor.
UPDATE floors SET price_per_sqm = 32000 WHERE floor_number = 0 AND price_per_sqm IS NULL;
UPDATE floors SET price_per_sqm = 26000 WHERE floor_number = 1 AND price_per_sqm IS NULL;
UPDATE floors SET price_per_sqm = 22000 WHERE floor_number = 2 AND price_per_sqm IS NULL;
UPDATE floors SET price_per_sqm = 18000 WHERE floor_number = 3 AND price_per_sqm IS NULL;
UPDATE floors SET price_per_sqm = 14000 WHERE floor_number >= 4 AND price_per_sqm IS NULL;
