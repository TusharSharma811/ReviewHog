-- DropForeignKey
ALTER TABLE "public"."Insight" DROP CONSTRAINT "Insight_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Repo" DROP CONSTRAINT "Repo_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_repoId_fkey";

-- AddForeignKey
ALTER TABLE "public"."Repo" ADD CONSTRAINT "Repo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Insight" ADD CONSTRAINT "Insight_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "public"."Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
