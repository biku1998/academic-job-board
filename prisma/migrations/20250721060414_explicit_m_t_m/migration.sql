/*
  Warnings:

  - You are about to drop the `_JobPostingToResearchArea` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_JobPostingToResearchArea" DROP CONSTRAINT "_JobPostingToResearchArea_A_fkey";

-- DropForeignKey
ALTER TABLE "_JobPostingToResearchArea" DROP CONSTRAINT "_JobPostingToResearchArea_B_fkey";

-- DropTable
DROP TABLE "_JobPostingToResearchArea";

-- CreateTable
CREATE TABLE "job_posting_research_areas" (
    "jobPostingId" INTEGER NOT NULL,
    "researchAreaId" INTEGER NOT NULL,

    CONSTRAINT "job_posting_research_areas_pkey" PRIMARY KEY ("jobPostingId","researchAreaId")
);

-- AddForeignKey
ALTER TABLE "job_posting_research_areas" ADD CONSTRAINT "job_posting_research_areas_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posting_research_areas" ADD CONSTRAINT "job_posting_research_areas_researchAreaId_fkey" FOREIGN KEY ("researchAreaId") REFERENCES "research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
