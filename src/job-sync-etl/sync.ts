import "dotenv/config";
import { extractJobs } from "./extract";
import { transformJobs } from "./transform";
import { loadJobs } from "./load";
import { markExpiredJobs, markRemovedJobs, archiveOldJobs } from "./status";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const main = async () => {
  const syncStartTime = Date.now();
  let syncLog = null;
  try {
    console.log("Starting job sync...");
    // Create sync log entry
    syncLog = await prisma.syncLog.create({
      data: {
        status: "running",
        jobsFetched: 0,
        jobsCreated: 0,
        jobsUpdated: 0,
        jobsExpired: 0,
        jobsRemoved: 0,
      },
    });
    // Extract jobs
    const jobs = await extractJobs();
    console.log(`Fetched ${jobs.length} jobs from API`);
    // Update sync log with fetched count
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { jobsFetched: jobs.length },
    });
    // Transform jobs (now using unified enrichment for cost optimization)
    const transformedData = await transformJobs(jobs);
    if (!transformedData) {
      throw new Error("Failed to transform job data");
    }
    console.log(`Transformed data:`, {
      institutions: transformedData.institutions.size,
      departments: transformedData.departments.size,
      disciplines: transformedData.disciplines.size,
      jobPostings: transformedData.jobPostings.length,
      keywords: transformedData.keywords.size,
    });
    console.log(
      `💡 Cost optimization: Used unified enrichment (1 LLM call per job instead of multiple calls)`
    );
    // Load jobs
    const loadStats = await loadJobs(transformedData);
    // Handle job status management
    console.log("Managing job status...");
    const expiredCount = await markExpiredJobs();
    console.log(`Marked ${expiredCount} jobs as expired`);
    const currentJobUrls = new Set(jobs.map((job) => job.url));
    const removedCount = await markRemovedJobs(currentJobUrls);
    console.log(`Marked ${removedCount} jobs as removed`);
    const archivedCount = await archiveOldJobs();
    console.log(`Archived ${archivedCount} old jobs`);
    // Update sync log with final stats
    const syncEndTime = Date.now();
    const durationMs = syncEndTime - syncStartTime;
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status:
          loadStats.errors && loadStats.errors.length > 0
            ? "partial"
            : "success",
        jobsCreated: loadStats.jobsCreated,
        jobsUpdated: loadStats.jobsUpdated,
        jobsExpired: expiredCount,
        jobsRemoved: removedCount,
        errors:
          loadStats.errors && loadStats.errors.length > 0
            ? JSON.stringify(loadStats.errors)
            : null,
        completedAt: new Date(),
        durationMs: durationMs,
      },
    });
    console.log("✅ Sync completed");
    console.log(
      `📊 Final stats: Created ${loadStats.jobsCreated}, Updated ${loadStats.jobsUpdated}, Expired ${expiredCount}, Removed ${removedCount}`
    );
  } catch (error) {
    console.error("Failed to sync jobs:", error);
    // Update sync log with error
    if (syncLog) {
      const syncEndTime = Date.now();
      const durationMs = syncEndTime - syncStartTime;
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errors: JSON.stringify([
            error instanceof Error ? error.message : String(error),
          ]),
          completedAt: new Date(),
          durationMs: durationMs,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
};

main();
