-- Simplify pipeline: remove RepoStandard, CustomRule; add temperature to Repo; remove standardsTriggered from Review

-- Drop RepoStandard table
DROP TABLE IF EXISTS "RepoStandard";

-- Drop CustomRule table  
DROP TABLE IF EXISTS "CustomRule";

-- Add temperature column to Repo (default 0.1)
ALTER TABLE "Repo" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.1;

-- Remove standardsTriggered column from Review
ALTER TABLE "Review" DROP COLUMN IF EXISTS "standardsTriggered";
