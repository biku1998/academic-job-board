import { extractJobs } from "./extract";
import { transformJobs } from "./transform";
import { loadJobs } from "./load";
import { markExpiredJobs, markRemovedJobs, archiveOldJobs } from "./status";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const main = async () => {
  try {
    console.log("Starting job sync...");
    // Extract jobs
    const jobs = await extractJobs();
    console.log(`Fetched ${jobs.length} jobs from API`);
    // Transform jobs
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
    // Load jobs
    const loadStats = await loadJobs(transformedData);
    // Status management
    console.log("Managing job status...");
    const expiredCount = await markExpiredJobs();
    console.log(`Marked ${expiredCount} jobs as expired`);
    const currentJobUrls = new Set(jobs.map((job) => job.url));
    const removedCount = await markRemovedJobs(currentJobUrls);
    console.log(`Marked ${removedCount} jobs as removed`);
    const archivedCount = await archiveOldJobs();
    console.log(`Archived ${archivedCount} old jobs`);
    console.log("✅ Sync completed");
    console.log(
      `📊 Final stats: Created ${loadStats.jobsCreated}, Updated ${loadStats.jobsUpdated}, Expired ${expiredCount}, Removed ${removedCount}`
    );
  } catch (error) {
    console.error("Failed to sync jobs:", error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
