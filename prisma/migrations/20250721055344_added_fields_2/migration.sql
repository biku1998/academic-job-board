-- AlterTable
ALTER TABLE "application_requirements" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "description" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "compensation_type" TEXT,
ADD COLUMN     "is_part_time" BOOLEAN,
ADD COLUMN     "is_self_financed" BOOLEAN,
ADD COLUMN     "work_hours_per_week" INTEGER;

-- CreateTable
CREATE TABLE "research_areas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "research_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JobPostingToResearchArea" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_JobPostingToResearchArea_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_areas_name_key" ON "research_areas"("name");

-- CreateIndex
CREATE INDEX "_JobPostingToResearchArea_B_index" ON "_JobPostingToResearchArea"("B");

-- AddForeignKey
ALTER TABLE "_JobPostingToResearchArea" ADD CONSTRAINT "_JobPostingToResearchArea_A_fkey" FOREIGN KEY ("A") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobPostingToResearchArea" ADD CONSTRAINT "_JobPostingToResearchArea_B_fkey" FOREIGN KEY ("B") REFERENCES "research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
