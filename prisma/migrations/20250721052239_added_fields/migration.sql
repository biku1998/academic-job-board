-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "qualifications" TEXT,
ALTER COLUMN "last_synced_at" SET DATA TYPE TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "sync_logs" ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMPTZ(0),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMPTZ(0);

-- CreateTable
CREATE TABLE "job_views" (
    "id" SERIAL NOT NULL,
    "job_posting_id" INTEGER NOT NULL,
    "viewed_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,

    CONSTRAINT "job_views_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "job_views" ADD CONSTRAINT "job_views_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
