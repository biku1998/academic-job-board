-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "enriched_at" TIMESTAMP(3),
ADD COLUMN     "enrichment_error" TEXT,
ADD COLUMN     "enrichment_status" TEXT DEFAULT 'pending',
ADD COLUMN     "last_attempt_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "job_postings_enrichment_status_idx" ON "job_postings"("enrichment_status");

-- CreateIndex
CREATE INDEX "job_postings_attempt_count_idx" ON "job_postings"("attempt_count");
