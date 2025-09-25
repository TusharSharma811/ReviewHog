/*
  Warnings:

  - You are about to drop the column `reviewerId` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reviewId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_reviewerId_fkey";

-- AlterTable
ALTER TABLE "public"."Repo" ADD COLUMN     "isReviewOn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Review" DROP COLUMN "reviewerId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "reviewId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Review_reviewId_key" ON "public"."Review"("reviewId");

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
