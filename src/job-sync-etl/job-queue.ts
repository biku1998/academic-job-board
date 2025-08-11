import { PrismaClient } from "@/generated/prisma";
import type { EnrichmentStats, JobEnrichmentStatus } from "./types";

const prisma = new PrismaClient();

export class JobEnrichmentQueue {
  /**
   * Get the next job that needs LLM enrichment
   */
  async getNextJobToEnrich(): Promise<JobEnrichmentStatus | null> {
    try {
      // Find a job that is pending or failed (with retry logic)
      const job = await prisma.jobPosting.findFirst({
        where: {
          OR: [
            { enrichmentStatus: "pending" },
            {
              AND: [
                { enrichmentStatus: "failed" },
                {
                  OR: [
                    { attemptCount: { lt: 3 } }, // Retry up to 3 times
                    {
                      lastAttemptAt: {
                        lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      },
                    }, // Or wait 24 hours
                  ],
                },
              ],
            },
          ],
          status: "active", // Only process active jobs
        },
        orderBy: [
          { enrichmentStatus: "asc" }, // pending first, then failed
          { lastAttemptAt: "asc" }, // oldest attempts first
        ],
        select: {
          id: true,
          title: true,
          enrichmentStatus: true,
          enrichmentError: true,
          enrichedAt: true,
          lastAttemptAt: true,
          attemptCount: true,
        },
      });

      if (job) {
        // Mark as in progress
        await prisma.jobPosting.update({
          where: { id: job.id },
          data: {
            enrichmentStatus: "in_progress",
            lastAttemptAt: new Date(),
            attemptCount: { increment: 1 },
          },
        });

        // Get the updated job to get the new attemptCount
        const updatedJob = await prisma.jobPosting.findUnique({
          where: { id: job.id },
          select: {
            id: true,
            title: true,
            enrichmentStatus: true,
            enrichmentError: true,
            enrichedAt: true,
            lastAttemptAt: true,
            attemptCount: true,
          },
        });

        if (!updatedJob) {
          throw new Error(`Job ${job.id} not found after update`);
        }

        return {
          ...updatedJob,
          enrichmentStatus: "in_progress",
          lastAttemptAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting next job for enrichment:", error);
      throw error;
    }
  }

  /**
   * Mark a job as successfully enriched
   */
  async markJobAsEnriched(jobId: number): Promise<void> {
    try {
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          enrichmentStatus: "enriched",
          enrichedAt: new Date(),
          lastAttemptAt: new Date(),
        },
      });
      console.log(`✅ Job ${jobId} marked as enriched`);
    } catch (error) {
      console.error(`Error marking job ${jobId} as enriched:`, error);
      throw error;
    }
  }

  /**
   * Mark a job as failed with error details
   */
  async markJobAsFailed(jobId: number, error: string): Promise<void> {
    try {
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          enrichmentStatus: "failed",
          enrichmentError: error,
          lastAttemptAt: new Date(),
        },
      });
      console.log(`❌ Job ${jobId} marked as failed: ${error}`);
    } catch (error) {
      console.error(`Error marking job ${jobId} as failed:`, error);
      throw error;
    }
  }

  /**
   * Reset a job back to pending (for manual retry)
   */
  async resetJobToPending(jobId: number): Promise<void> {
    try {
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          enrichmentStatus: "pending",
          enrichmentError: null,
          attemptCount: 0,
        },
      });
      console.log(`🔄 Job ${jobId} reset to pending`);
    } catch (error) {
      console.error(`Error resetting job ${jobId} to pending:`, error);
      throw error;
    }
  }

  /**
   * Get enrichment progress statistics
   */
  async getEnrichmentProgress(): Promise<EnrichmentStats> {
    try {
      const stats = await prisma.jobPosting.groupBy({
        by: ["enrichmentStatus"],
        where: {
          status: "active",
        },
        _count: {
          id: true,
        },
      });

      const result: EnrichmentStats = {
        total: 0,
        pending: 0,
        enriched: 0,
        failed: 0,
        inProgress: 0,
      };

      stats.forEach((stat) => {
        const count = stat._count.id;
        result.total += count;

        switch (stat.enrichmentStatus) {
          case "pending":
            result.pending += count;
            break;
          case "enriched":
            result.enriched += count;
            break;
          case "failed":
            result.failed += count;
            break;
          case "in_progress":
            result.inProgress += count;
            break;
        }
      });

      return result;
    } catch (error) {
      console.error("Error getting enrichment progress:", error);
      throw error;
    }
  }

  /**
   * Get detailed status of all jobs
   */
  async getAllJobStatuses(): Promise<JobEnrichmentStatus[]> {
    try {
      const jobs = await prisma.jobPosting.findMany({
        where: {
          status: "active",
        },
        select: {
          id: true,
          title: true,
          enrichmentStatus: true,
          enrichmentError: true,
          enrichedAt: true,
          lastAttemptAt: true,
          attemptCount: true,
        },
        orderBy: [{ enrichmentStatus: "asc" }, { lastAttemptAt: "asc" }],
      });

      return jobs.map((job) => ({
        id: job.id,
        title: job.title,
        enrichmentStatus:
          (job.enrichmentStatus as
            | "pending"
            | "enriched"
            | "failed"
            | "in_progress") || "pending",
        enrichmentError: job.enrichmentError,
        enrichedAt: job.enrichedAt,
        lastAttemptAt: job.lastAttemptAt,
        attemptCount: job.attemptCount || 0,
      }));
    } catch (error) {
      console.error("Error getting all job statuses:", error);
      throw error;
    }
  }

  /**
   * Clean up completed enrichments (optional maintenance)
   */
  async cleanupCompletedEnrichments(): Promise<number> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await prisma.jobPosting.updateMany({
        where: {
          enrichmentStatus: "enriched",
          enrichedAt: { lt: oneWeekAgo },
        },
        data: {
          enrichmentStatus: "completed", // Mark as completed after a week
        },
      });

      console.log(`🧹 Cleaned up ${result.count} completed enrichments`);
      return result.count;
    } catch (error) {
      console.error("Error cleaning up completed enrichments:", error);
      throw error;
    }
  }
}
