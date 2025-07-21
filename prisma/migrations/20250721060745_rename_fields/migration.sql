/*
  Warnings:

  - The primary key for the `job_posting_research_areas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `jobPostingId` on the `job_posting_research_areas` table. All the data in the column will be lost.
  - You are about to drop the column `researchAreaId` on the `job_posting_research_areas` table. All the data in the column will be lost.
  - Added the required column `job_posting_id` to the `job_posting_research_areas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `research_area_id` to the `job_posting_research_areas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "job_posting_research_areas" DROP CONSTRAINT "job_posting_research_areas_jobPostingId_fkey";

-- DropForeignKey
ALTER TABLE "job_posting_research_areas" DROP CONSTRAINT "job_posting_research_areas_researchAreaId_fkey";

-- AlterTable
ALTER TABLE "job_posting_research_areas" DROP CONSTRAINT "job_posting_research_areas_pkey",
DROP COLUMN "jobPostingId",
DROP COLUMN "researchAreaId",
ADD COLUMN     "job_posting_id" INTEGER NOT NULL,
ADD COLUMN     "research_area_id" INTEGER NOT NULL,
ADD CONSTRAINT "job_posting_research_areas_pkey" PRIMARY KEY ("job_posting_id", "research_area_id");

-- AddForeignKey
ALTER TABLE "job_posting_research_areas" ADD CONSTRAINT "job_posting_research_areas_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posting_research_areas" ADD CONSTRAINT "job_posting_research_areas_research_area_id_fkey" FOREIGN KEY ("research_area_id") REFERENCES "research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
