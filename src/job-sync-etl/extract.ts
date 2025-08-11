import axios from "axios";
import { config } from "@/config";
import { JobListingResponseSchema } from "./types";
import type { JobPosting } from "./types";

export const extractJobs = async () => {
  const jobPosts: JobPosting[] = [];
  let page = 1;
  let totalCount = 0;
  const limit = 10;

  try {
    do {
      console.log(`Fetching page ${page}...`);
      const response = await axios.get(`${config.jobSourceUrl}/jobs`, {
        params: {
          page,
          limit,
        },
      });
      // Log response for debugging
      console.log(`API Response for page ${page}:`, {
        status: response.status,
        dataKeys: Object.keys(response.data),
        resultsCount: response.data?.results?.length || 0,
      });
      const { error, data: validatedResponse } =
        JobListingResponseSchema.safeParse(response.data);
      if (error) {
        console.error("Error parsing job listing response:", error);
        throw new Error("Invalid job listing response");
      }
      if (page === 1) {
        totalCount = validatedResponse.total_count;
        console.log(`Total jobs to fetch: ${totalCount}`);
      }
      jobPosts.push(...validatedResponse.results);
      console.log(
        `Fetched ${validatedResponse.results.length} jobs from page ${page}`
      );
      page++;
      // Add a small delay to be respectful to the server
      console.log("Waiting 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // DEV: Break after 2 pages for development
      if (page > 2) {
        console.log("DEV: Breaking after 2 pages for development");
        break;
      }
    } while (jobPosts.length < totalCount);
    console.log(`Successfully fetched all ${jobPosts.length} jobs`);
    return jobPosts;
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};
