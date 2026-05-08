-- AlterTable
ALTER TABLE "public"."Insight" ADD COLUMN     "cleanPasses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "issuesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastReviewAt" TIMESTAMP(3);
