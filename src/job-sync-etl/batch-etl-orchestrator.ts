import "dotenv/config";
import { extractJobs } from "./extract";
import { transformJobs } from "./transform";
import { loadJobs } from "./load";
import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import type { TransformedJob, JobPosting } from "./types";

// Type for the transformed data structure
type TransformedData = {
  institutions: Map<string, Omit<Institution, "id">>;
  departments: Map<string, Omit<Department, "id"> & { institutionKey: string }>;
  disciplines: Map<string, Omit<Discipline, "id">>;
  jobPostings: Array<TransformedJob>;
  keywords: Map<string, Omit<Keyword, "id">>;
};

export interface BatchETLOptions {
  // Batch processing options
  pageSize?: number; // Jobs per batch (default: 5)
  maxPages?: number; // Maximum pages to process (default: Infinity)
  devBreakAfter?: number; // Dev break after N pages (default: 1)

  // LLM enrichment options
  enableLLMEnrichment?: boolean; // Whether to run LLM enrichment (default: true)

  // General options
  continueOnError?: boolean; // Continue on individual batch failures (default: true)
  dryRun?: boolean; // Don't actually save to database (default: false)
}

export interface BatchETLResult {
  totalBatches: number;
  successfulBatches: number;
  failedBatches: number;
  totalJobsProcessed: number;
  totalJobsSaved: number;
  totalJobsFailed: number;
  duration: number;
  errors: string[];
}

export class BatchETLOrchestrator {
  private options: Required<BatchETLOptions>;

  constructor(options: BatchETLOptions = {}) {
    this.options = {
      pageSize: options.pageSize ?? 5,
      maxPages: options.maxPages ?? Infinity,
      devBreakAfter: options.devBreakAfter ?? 1,
      enableLLMEnrichment: options.enableLLMEnrichment ?? true,
      continueOnError: options.continueOnError ?? true,
      dryRun: options.dryRun ?? false,
    };
  }

  /**
   * Main batch ETL process
   */
  async runBatchETL(): Promise<BatchETLResult> {
    const startTime = Date.now();
    console.log("🚀 Starting batch-by-batch ETL process...");
    console.log("📋 Configuration:", this.options);

    const result: BatchETLResult = {
      totalBatches: 0,
      successfulBatches: 0,
      failedBatches: 0,
      totalJobsProcessed: 0,
      totalJobsSaved: 0,
      totalJobsFailed: 0,
      duration: 0,
      errors: [],
    };

    try {
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage <= this.options.maxPages) {
        console.log(
          `\n🔄 Processing Batch ${currentPage} (${this.options.pageSize} jobs)...`
        );

        try {
          // Extract batch
          const batchJobs = await this.extractBatch(currentPage, result);

          if (batchJobs.length === 0) {
            console.log("📄 No more jobs to process");
            break;
          }

          result.totalBatches++;
          result.totalJobsProcessed += batchJobs.length;

          // Transform batch (with LLM enrichment if enabled)
          const transformedData = await this.transformBatch(batchJobs, result);

          if (!transformedData) {
            throw new Error("Batch transformation failed");
          }

          // Load batch to database
          await this.loadBatch(transformedData, result);

          console.log(`✅ Batch ${currentPage} completed successfully!`);
          console.log(`   📊 Jobs processed: ${batchJobs.length}`);
          console.log(
            `   💾 Jobs saved: ${transformedData.jobPostings.length}`
          );

          result.successfulBatches++;

          // Check if we should continue
          if (currentPage >= this.options.devBreakAfter) {
            console.log(
              `🛑 DEV: Breaking after ${this.options.devBreakAfter} batches`
            );
            break;
          }

          // Check if we've reached the end
          if (batchJobs.length < this.options.pageSize) {
            console.log("📄 Reached last page (fewer jobs than page size)");
            hasMorePages = false;
          } else {
            currentPage++;

            // Small delay between batches
            if (hasMorePages) {
              console.log("⏳ Waiting 3 seconds before next batch...");
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Batch ${currentPage} failed:`, errorMessage);

          result.failedBatches++;
          result.errors.push(`Batch ${currentPage}: ${errorMessage}`);

          if (!this.options.continueOnError) {
            throw error;
          }

          // Continue to next batch
          currentPage++;
        }
      }

      const endTime = Date.now();
      result.duration = endTime - startTime;

      console.log("\n🎉 Batch ETL process completed!");
      console.log("📊 Final Results:", result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Batch ETL process failed:", errorMessage);

      result.duration = Date.now() - startTime;
      result.errors.push(`Process failure: ${errorMessage}`);

      if (!this.options.continueOnError) {
        throw error;
      }

      return result;
    }
  }

  /**
   * Extract a single batch of jobs
   */
  private async extractBatch(
    page: number,
    result: BatchETLResult
  ): Promise<JobPosting[]> {
    console.log(`📥 Extracting batch ${page}...`);

    const batchJobs = await extractJobs({
      pageSize: this.options.pageSize,
      maxPages: 1, // Only extract 1 page at a time
      devBreakAfter: 1,
    });

    console.log(`✅ Extracted ${batchJobs.length} jobs for batch ${page}`);
    return batchJobs;
  }

  /**
   * Transform a single batch of jobs
   */
  private async transformBatch(
    jobs: JobPosting[],
    result: BatchETLResult
  ): Promise<TransformedData | null> {
    console.log(`🔄 Transforming ${jobs.length} jobs...`);

    try {
      const transformOptions = {
        // LLM-based extractions (enabled if requested)
        enableKeywordExtraction: this.options.enableLLMEnrichment,
        enableJobAttributes: this.options.enableLLMEnrichment,
        enableJobDetails: this.options.enableLLMEnrichment,
        enableApplicationRequirements: this.options.enableLLMEnrichment,
        enableLanguageRequirements: this.options.enableLLMEnrichment,
        enableSuitableBackgrounds: this.options.enableLLMEnrichment,
        enableGeoLocation: this.options.enableLLMEnrichment,
        enableContact: this.options.enableLLMEnrichment,
        enableResearchAreas: this.options.enableLLMEnrichment,

        // Deterministic transformations (always enabled)
        enableBasicTransformation: true,
        enableDateParsing: true,
        enableSalaryParsing: true,
        enableLocationParsing: true,
        enableInstitutionParsing: true,
        enableDeadlineParsing: true,
      };

      const transformedData = await transformJobs(jobs, transformOptions);

      console.log(
        `✅ Transformed ${transformedData.jobPostings.length} jobs successfully`
      );
      return transformedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Batch transformation failed:", errorMessage);
      throw error;
    }
  }

  /**
   * Load a single batch to database
   */
  private async loadBatch(
    transformedData: TransformedData,
    result: BatchETLResult
  ): Promise<void> {
    if (this.options.dryRun) {
      console.log("🧪 DRY RUN: Would save jobs to database");
      return;
    }

    console.log(
      `💾 Loading ${transformedData.jobPostings.length} jobs to database...`
    );

    try {
      const loadResult = await loadJobs(transformedData);

      result.totalJobsSaved += loadResult.jobsCreated + loadResult.jobsUpdated;
      result.totalJobsFailed += loadResult.errors.length;

      console.log(
        `✅ Loaded ${
          loadResult.jobsCreated + loadResult.jobsUpdated
        } jobs successfully`
      );

      if (loadResult.errors.length > 0) {
        console.log(`⚠️  Failed to load ${loadResult.errors.length} jobs`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Batch loading failed:", errorMessage);
      throw error;
    }
  }
}

/**
 * Convenience function for running batch ETL
 */
export async function runBatchETL(
  options: BatchETLOptions = {}
): Promise<BatchETLResult> {
  const orchestrator = new BatchETLOrchestrator(options);
  return await orchestrator.runBatchETL();
}
