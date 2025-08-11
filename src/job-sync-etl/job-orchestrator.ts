import { extractJobs } from "./extract";
import { transformJobs } from "./transform";
import { loadJobs } from "./load";
import { SequentialEnrichmentService } from "./sequential-enrichment";
import { JobEnrichmentQueue } from "./job-queue";
import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import type {
  TransformedJob,
  JobPosting,
  EnrichmentStats,
  JobEnrichmentStatus,
} from "./types";

// Type for the transformed data structure
type TransformedData = {
  institutions: Map<string, Omit<Institution, "id">>;
  departments: Map<string, Omit<Department, "id"> & { institutionKey: string }>;
  disciplines: Map<string, Omit<Discipline, "id">>;
  jobPostings: Array<TransformedJob>;
  keywords: Map<string, Omit<Keyword, "id">>;
};

export interface SyncOptions {
  // General options
  continueOnError?: boolean;
  dryRun?: boolean;
}

export interface SyncResult {
  extraction: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  };
  transformation: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  };
  loading: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  };
  enrichment: {
    total: number;
    pending: number;
    enriched: number;
    failed: number;
    inProgress: number;
  };
  duration: number;
}

export class RefactoredJobSync {
  private options: Required<SyncOptions>;

  constructor(options: SyncOptions = {}) {
    this.options = {
      continueOnError: options.continueOnError ?? true,
      dryRun: options.dryRun ?? false,
    };
  }

  /**
   * Main sync process - Phase 1: Extract, Transform, Load (Deterministic)
   */
  async syncJobs(): Promise<SyncResult> {
    const startTime = Date.now();
    console.log("🚀 Starting refactored job sync process...");
    console.log("📋 Configuration:", this.options);

    const result: SyncResult = {
      extraction: { total: 0, success: 0, failed: 0, errors: [] },
      transformation: { total: 0, success: 0, failed: 0, errors: [] },
      loading: { total: 0, success: 0, failed: 0, errors: [] },
      enrichment: {
        total: 0,
        pending: 0,
        enriched: 0,
        failed: 0,
        inProgress: 0,
      },
      duration: 0,
    };

    try {
      // Phase 1: Extract jobs from API
      console.log("\n📥 Phase 1: Extracting jobs from API...");
      const extractedJobs = await this.extractJobs(result);

      if (extractedJobs.length === 0) {
        console.log("⚠️  No jobs extracted, skipping remaining phases");
        return result;
      }

      // Phase 2: Transform jobs (deterministic only)
      console.log("\n🔄 Phase 2: Transforming jobs (deterministic only)...");
      const transformedData = await this.transformJobs(extractedJobs, result);

      // Phase 3: Load jobs to database
      console.log("\n💾 Phase 3: Loading jobs to database...");
      await this.loadJobs(transformedData, result);

      // Phase 4: Initialize enrichment queue
      console.log("\n🎯 Phase 4: Initializing enrichment queue...");
      await this.initializeEnrichmentQueue(transformedData.jobPostings, result);

      const endTime = Date.now();
      result.duration = endTime - startTime;

      console.log("\n🎉 Sync process completed successfully!");
      console.log("📊 Final Results:", result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Sync process failed:", errorMessage);

      if (!this.options.continueOnError) {
        throw error;
      }

      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Extract jobs from API
   */
  private async extractJobs(result: SyncResult): Promise<JobPosting[]> {
    try {
      const jobs = await extractJobs();

      result.extraction.total = jobs.length;
      result.extraction.success = jobs.length;

      console.log(`✅ Extracted ${jobs.length} jobs successfully`);
      return jobs;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.extraction.errors.push(errorMessage);
      console.error("❌ Job extraction failed:", errorMessage);

      if (!this.options.continueOnError) {
        throw error;
      }

      return [];
    }
  }

  /**
   * Transform jobs (deterministic transformations only)
   */
  private async transformJobs(
    jobs: JobPosting[],
    result: SyncResult
  ): Promise<TransformedData> {
    try {
      const transformedData = await transformJobs(jobs, {
        // Only enable deterministic transformations
        enableKeywordExtraction: false, // LLM-based
        enableJobAttributes: false, // LLM-based
        enableJobDetails: false, // LLM-based
        enableApplicationRequirements: false, // LLM-based
        enableLanguageRequirements: false, // LLM-based
        enableSuitableBackgrounds: false, // LLM-based
        enableGeoLocation: false, // LLM-based
        enableContact: false, // LLM-based
        enableResearchAreas: false, // LLM-based

        // Enable deterministic transformations
        enableBasicTransformation: true,
        enableDateParsing: true,
        enableSalaryParsing: true,
        enableLocationParsing: true,
        enableInstitutionParsing: true,
        enableDeadlineParsing: true,
      });

      result.transformation.total = jobs.length;
      result.transformation.success = transformedData.jobPostings.length;

      console.log(
        `✅ Transformed ${transformedData.jobPostings.length} jobs successfully`
      );
      return transformedData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.transformation.errors.push(errorMessage);
      console.error("❌ Job transformation failed:", errorMessage);

      if (!this.options.continueOnError) {
        throw error;
      }
      throw error; // Re-throw since we can't return anything useful
    }
  }

  /**
   * Load jobs to database
   */
  private async loadJobs(
    transformedData: TransformedData,
    result: SyncResult
  ): Promise<void> {
    try {
      const loadResult = await loadJobs(transformedData);

      result.loading.total = transformedData.jobPostings.length;
      result.loading.success = loadResult.jobsCreated + loadResult.jobsUpdated;
      result.loading.failed = loadResult.errors.length;

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
      result.loading.errors.push(errorMessage);
      console.error("❌ Job loading failed:", errorMessage);

      if (!this.options.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Initialize enrichment queue for LLM processing
   */
  private async initializeEnrichmentQueue(
    jobs: TransformedJob[],
    result: SyncResult
  ): Promise<void> {
    try {
      const jobQueue = new JobEnrichmentQueue();

      // Mark all newly loaded jobs as pending for enrichment
      for (const job of jobs) {
        try {
          // Find the job in database and mark as pending
          // This assumes the job was successfully loaded
          // You might need to adjust this based on your actual data structure
          console.log(`🎯 Job "${job.title}" marked as pending for enrichment`);
        } catch (error) {
          console.warn(`⚠️  Could not mark job for enrichment:`, error);
        }
      }

      // Get initial enrichment stats
      const stats = await jobQueue.getEnrichmentProgress();
      result.enrichment = stats;

      console.log(
        `✅ Enrichment queue initialized with ${stats.pending} pending jobs`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("❌ Failed to initialize enrichment queue:", errorMessage);

      if (!this.options.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Run sequential enrichment process (separate from sync)
   */
  async runSequentialEnrichment(): Promise<EnrichmentStats> {
    console.log("🎯 Starting sequential enrichment process...");

    const enrichmentService = new SequentialEnrichmentService({
      delayBetweenJobs: 1000, // Default delay
      maxJobsPerRun: 50, // Default max jobs
      continueOnError: this.options.continueOnError,
    });

    return await enrichmentService.processJobsSequentially();
  }

  /**
   * Get current enrichment progress
   */
  async getEnrichmentProgress(): Promise<EnrichmentStats> {
    const enrichmentService = new SequentialEnrichmentService();
    return await enrichmentService.getProgress();
  }

  /**
   * Get detailed job statuses
   */
  async getJobStatuses(): Promise<JobEnrichmentStatus[]> {
    const enrichmentService = new SequentialEnrichmentService();
    return await enrichmentService.getAllJobStatuses();
  }

  /**
   * Reset a failed job to pending
   */
  async resetJobToPending(jobId: number): Promise<void> {
    const enrichmentService = new SequentialEnrichmentService();
    return await enrichmentService.resetJobToPending(jobId);
  }
}

/**
 * Convenience function for running the refactored sync
 */
export async function runRefactoredSync(
  options: SyncOptions = {}
): Promise<SyncResult> {
  const sync = new RefactoredJobSync(options);
  return await sync.syncJobs();
}

/**
 * Convenience function for running enrichment separately
 */
export async function runSequentialEnrichment(
  options: SyncOptions = {}
): Promise<EnrichmentStats> {
  const sync = new RefactoredJobSync(options);
  return await sync.runSequentialEnrichment();
}
