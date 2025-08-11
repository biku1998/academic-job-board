import axios from "axios";
import { config } from "@/config";
import { JobListingResponseSchema } from "./types";
import type { JobPosting } from "./types";

export const extractJobs = async (
  options: {
    pageSize?: number;
    maxPages?: number;
    devBreakAfter?: number;
  } = {}
): Promise<JobPosting[]> => {
  const {
    pageSize = 5, // Default to 5 jobs per batch
    maxPages = Infinity, // No limit by default
    devBreakAfter = 1, // Dev break after 1 page for testing
  } = options;

  const allJobs: JobPosting[] = [];
  let currentPage = 1;
  let totalJobs = 0;

  console.log(`🚀 Starting job extraction with page size: ${pageSize}`);

  try {
    while (currentPage <= maxPages) {
      console.log(`📥 Fetching page ${currentPage}...`);

      const response = await fetch(
        `${config.jobSourceUrl}/jobs?page=${currentPage}&limit=${pageSize}`
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      console.log(`API Response for page ${currentPage}:`, {
        status: response.status,
        dataKeys: Object.keys(data),
        resultsCount: data.results?.length || 0,
      });

      if (!data.results || !Array.isArray(data.results)) {
        console.warn(`⚠️  Invalid response format for page ${currentPage}`);
        break;
      }

      const pageJobs = data.results as JobPosting[];
      allJobs.push(...pageJobs);

      console.log(`Fetched ${pageJobs.length} jobs from page ${currentPage}`);

      // Update total count from first page
      if (currentPage === 1) {
        totalJobs = data.total_count || 0;
        console.log(`Total jobs to fetch: ${totalJobs}`);
      }

      // Check if we've reached the end
      if (pageJobs.length < pageSize) {
        console.log(
          `📄 Reached last page (${pageJobs.length} jobs < ${pageSize})`
        );
        break;
      }

      // Dev break for testing
      if (currentPage >= devBreakAfter) {
        console.log(
          `DEV: Breaking after ${devBreakAfter} pages for development`
        );
        break;
      }

      // Wait between pages to be respectful to the API
      if (currentPage < maxPages) {
        console.log("Waiting 2 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      currentPage++;
    }

    console.log(`✅ Successfully fetched all ${allJobs.length} jobs`);
    return allJobs;
  } catch (error) {
    console.error("❌ Error during job extraction:", error);
    throw error;
  }
};
