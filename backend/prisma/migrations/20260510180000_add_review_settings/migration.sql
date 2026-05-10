ALTER TABLE "public"."User"
ADD COLUMN     "aiReviewsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultRepoReviewOn" BOOLEAN NOT NULL DEFAULT true;
