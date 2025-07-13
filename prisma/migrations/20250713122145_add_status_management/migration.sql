-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "jobs_fetched" INTEGER NOT NULL,
    "jobs_created" INTEGER NOT NULL,
    "jobs_updated" INTEGER NOT NULL,
    "jobs_expired" INTEGER NOT NULL,
    "jobs_removed" INTEGER NOT NULL,
    "errors" TEXT,
    "duration_ms" INTEGER,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_postings_status_idx" ON "job_postings"("status");

-- CreateIndex
CREATE INDEX "job_postings_is_active_idx" ON "job_postings"("is_active");

-- CreateIndex
CREATE INDEX "job_postings_last_synced_at_idx" ON "job_postings"("last_synced_at");

-- CreateIndex
CREATE INDEX "job_postings_expires_at_idx" ON "job_postings"("expires_at");
