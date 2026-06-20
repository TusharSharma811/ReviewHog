-- AlterTable
ALTER TABLE "public"."Repo" ADD COLUMN     "reviewInstructions" TEXT;

-- AlterTable
ALTER TABLE "public"."Review" ADD COLUMN     "criticalCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "findingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "findingsJson" JSONB,
ADD COLUMN     "highCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pipelineVersion" TEXT NOT NULL DEFAULT 'v3',
ADD COLUMN     "prUrl" TEXT,
ADD COLUMN     "processingMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewersUsed" TEXT[],
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "stagesRun" TEXT[],
ADD COLUMN     "standardsTriggered" TEXT[],
ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "aiBaseUrl" TEXT,
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."CustomRule" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RepoStandard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoStandard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."CustomRule" ADD CONSTRAINT "CustomRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RepoStandard" ADD CONSTRAINT "RepoStandard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
