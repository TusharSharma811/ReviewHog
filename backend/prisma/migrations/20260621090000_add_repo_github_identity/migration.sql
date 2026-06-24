-- AlterTable
ALTER TABLE "public"."Repo" ADD COLUMN "githubRepoId" TEXT;

-- Backfill repos that were created from GitHub installation webhooks, where
-- the primary key was the numeric GitHub repository id.
UPDATE "public"."Repo"
SET "githubRepoId" = "id"
WHERE "id" ~ '^[0-9]+$';

-- The old schema made repository URLs globally unique, which prevented two
-- users from connecting the same repository. Scope uniqueness to the owner.
DROP INDEX IF EXISTS "public"."Repo_url_key";

CREATE UNIQUE INDEX "Repo_ownerId_url_key" ON "public"."Repo"("ownerId", "url");
CREATE UNIQUE INDEX "Repo_ownerId_githubRepoId_key" ON "public"."Repo"("ownerId", "githubRepoId");
