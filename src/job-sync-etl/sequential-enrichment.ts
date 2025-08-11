import { PrismaClient } from "@/generated/prisma";
import { JobEnrichmentService } from "./services/job-enrichment";
import { JobEnrichmentQueue } from "./job-queue";
import type {
  EnrichmentOptions,
  JobDataForEnrichment,
  EnrichedData,
  EnrichmentStats,
} from "./types";

const prisma = new PrismaClient();

export class SequentialEnrichmentService {
  private jobEnrichmentService: JobEnrichmentService;
  private jobQueue: JobEnrichmentQueue;
  private options: Required<EnrichmentOptions>;

  constructor(options: EnrichmentOptions = {}) {
    this.jobEnrichmentService = new JobEnrichmentService();
    this.jobQueue = new JobEnrichmentQueue();
    this.options = {
      delayBetweenJobs: options.delayBetweenJobs ?? 1000, // 1 second default
      maxJobsPerRun: options.maxJobsPerRun ?? 50, // 50 jobs per run default
      continueOnError: options.continueOnError ?? true, // continue on error by default
    };
  }

  /**
   * Process jobs sequentially for LLM enrichment
   */
  async processJobsSequentially(): Promise<EnrichmentStats> {
    console.log("🚀 Starting sequential job enrichment...");
    console.log(
      `⚙️  Configuration: ${this.options.delayBetweenJobs}ms delay, max ${this.options.maxJobsPerRun} jobs per run`
    );

    let processedCount = 0;
    const startTime = Date.now();

    try {
      // Check if LLM service is available
      if (!this.jobEnrichmentService.isAvailable()) {
        throw new Error("LLM enrichment service is not available");
      }

      // Check service health
      const isHealthy = await this.jobEnrichmentService.isHealthy();
      if (!isHealthy) {
        throw new Error("LLM enrichment service is not healthy");
      }

      console.log("✅ LLM service is healthy and ready");

      while (processedCount < this.options.maxJobsPerRun) {
        // Get next job to process
        const jobStatus = await this.jobQueue.getNextJobToEnrich();

        if (!jobStatus) {
          console.log("✅ No more jobs to process");
          break;
        }

        console.log(
          `\n🔄 Processing job ${jobStatus.id}: "${jobStatus.title}" (Attempt ${jobStatus.attemptCount})`
        );

        try {
          // Get full job data from database
          const jobData = await this.getJobDataForEnrichment(jobStatus.id);
          if (!jobData) {
            throw new Error("Failed to retrieve job data from database");
          }

          // Perform LLM enrichment
          await this.enrichSingleJob(jobData);

          // Mark as successfully enriched
          await this.jobQueue.markJobAsEnriched(jobStatus.id);

          console.log(`✅ Job ${jobStatus.id} enriched successfully`);
          processedCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Failed to enrich job ${jobStatus.id}: ${errorMessage}`
          );

          // Mark as failed
          await this.jobQueue.markJobAsFailed(jobStatus.id, errorMessage);

          if (!this.options.continueOnError) {
            throw error; // Stop processing if we shouldn't continue on error
          }
        }

        // Add delay between jobs to respect Ollama's single-request limit
        if (processedCount < this.options.maxJobsPerRun) {
          console.log(
            `⏳ Waiting ${this.options.delayBetweenJobs}ms before next job...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.delayBetweenJobs)
          );
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`\n🎉 Sequential enrichment completed!`);
      console.log(`📊 Processed ${processedCount} jobs in ${duration}ms`);
      console.log(`⏱️  Average time per job: ${duration / processedCount}ms`);

      // Get final statistics
      const finalStats = await this.jobQueue.getEnrichmentProgress();
      console.log(`📈 Final stats:`, finalStats);

      return finalStats;
    } catch (error) {
      console.error("❌ Sequential enrichment failed:", error);
      throw error;
    }
  }

  /**
   * Enrich a single job with all LLM-based extractions
   */
  private async enrichSingleJob(jobData: JobDataForEnrichment): Promise<void> {
    const {
      title,
      descriptionText,
      salaryRange,
      instructions,
      qualifications,
    } = jobData;

    console.log(`  🔍 Extracting keywords...`);
    const keywords = await this.jobEnrichmentService.extractKeywords(
      title,
      descriptionText || "",
      qualifications || ""
    );

    console.log(`  🔍 Extracting job attributes...`);
    const jobAttributes = await this.jobEnrichmentService.extractJobAttributes(
      title,
      descriptionText || "",
      salaryRange || ""
    );

    console.log(`  🔍 Extracting job details...`);
    const jobDetails = await this.jobEnrichmentService.extractJobDetails(
      title,
      descriptionText || "",
      salaryRange || "",
      instructions || "",
      qualifications || ""
    );

    console.log(`  🔍 Extracting application requirements...`);
    const applicationReqs =
      await this.jobEnrichmentService.extractApplicationRequirements(
        descriptionText || ""
      );

    console.log(`  🔍 Extracting language requirements...`);
    const languageReqs =
      await this.jobEnrichmentService.extractLanguageRequirements(
        descriptionText || ""
      );

    console.log(`  🔍 Extracting suitable backgrounds...`);
    const suitableBackgrounds =
      await this.jobEnrichmentService.extractSuitableBackgrounds(
        descriptionText || ""
      );

    console.log(`  🔍 Extracting geolocation...`);
    const geoLocation = await this.jobEnrichmentService.extractGeoLocation(
      title,
      descriptionText || "",
      "" // No location field in JobDataForEnrichment
    );

    console.log(`  🔍 Extracting contact information...`);
    const contact = await this.jobEnrichmentService.extractContact(
      descriptionText || "",
      instructions || ""
    );

    console.log(`  🔍 Extracting research areas...`);
    const researchAreas = await this.jobEnrichmentService.extractResearchAreas(
      title,
      descriptionText || ""
    );

    // Update database with enriched data
    await this.updateJobWithEnrichedData(jobData.id, {
      keywords,
      jobAttributes,
      jobDetails,
      applicationReqs,
      languageReqs,
      suitableBackgrounds,
      geoLocation,
      contact,
      researchAreas,
    });
  }

  /**
   * Get job data needed for enrichment from database
   */
  private async getJobDataForEnrichment(
    jobId: number
  ): Promise<JobDataForEnrichment | null> {
    try {
      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          descriptionText: true,
          descriptionHtml: true,
          salaryRange: true,
          instructions: true,
          qualifications: true,
        },
      });

      return job;
    } catch (error) {
      console.error(`Error retrieving job data for enrichment:`, error);
      return null;
    }
  }

  /**
   * Update job in database with enriched data
   */
  private async updateJobWithEnrichedData(
    jobId: number,
    enrichedData: EnrichedData
  ): Promise<void> {
    try {
      // Update main job posting with enriched fields
      await prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          // Job attributes
          category:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.category
              : null,
          workModality:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.workModality
              : null,
          contractType:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.contractType
              : null,
          durationMonths:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.durationMonths
              : null,
          renewable:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.renewable
              : null,
          fundingSource:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.fundingSource
              : null,
          visaSponsorship:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.visaSponsorship
              : null,
          interviewProcess:
            enrichedData.jobAttributes.confidence > 0.5
              ? enrichedData.jobAttributes.interviewProcess
              : null,

          // Job details (Phase 1)
          isSelfFinanced:
            enrichedData.jobDetails.confidence > 0.3
              ? enrichedData.jobDetails.isSelfFinanced
              : null,
          isPartTime:
            enrichedData.jobDetails.confidence > 0.3
              ? enrichedData.jobDetails.isPartTime
              : null,
          workHoursPerWeek:
            enrichedData.jobDetails.confidence > 0.3
              ? enrichedData.jobDetails.workHoursPerWeek
              : null,
          compensationType:
            enrichedData.jobDetails.confidence > 0.3
              ? enrichedData.jobDetails.compensationType
              : null,
        },
      });

      // Update or create Phase 2 relationships
      await this.updatePhase2Data(jobId, enrichedData);

      // Update or create Phase 3 relationships
      await this.updatePhase3Data(jobId, enrichedData);

      console.log(`  💾 Enriched data saved to database`);
    } catch (error) {
      console.error(`Error updating job with enriched data:`, error);
      throw error;
    }
  }

  /**
   * Update Phase 2 data (application requirements, language requirements, suitable backgrounds)
   */
  private async updatePhase2Data(
    jobId: number,
    enrichedData: EnrichedData
  ): Promise<void> {
    // Application Requirements
    if (enrichedData.applicationReqs.confidence > 0.3) {
      // Delete existing application requirements
      await prisma.applicationRequirement.deleteMany({
        where: { jobPostingId: jobId },
      });

      // Create new one
      await prisma.applicationRequirement.create({
        data: {
          jobPostingId: jobId,
          documentType: enrichedData.applicationReqs.documentTypes.join(", "),
          referenceLettersRequired:
            enrichedData.applicationReqs.referenceLettersRequired,
          platform: enrichedData.applicationReqs.platform,
          description: `Documents: ${enrichedData.applicationReqs.documentTypes.join(
            ", "
          )}`,
        },
      });
    }

    // Language Requirements
    if (
      enrichedData.languageReqs.confidence > 0.3 &&
      enrichedData.languageReqs.languages.length > 0
    ) {
      // Remove existing language requirements
      await prisma.languageRequirement.deleteMany({
        where: { jobPostingId: jobId },
      });

      // Create new ones
      const languageRelations = enrichedData.languageReqs.languages.map(
        (language: string) => ({
          jobPostingId: jobId,
          language: language,
        })
      );

      await prisma.languageRequirement.createMany({
        data: languageRelations,
      });
    }

    // Suitable Backgrounds
    if (
      enrichedData.suitableBackgrounds.confidence > 0.3 &&
      enrichedData.suitableBackgrounds.backgrounds.length > 0
    ) {
      // Remove existing suitable backgrounds
      await prisma.suitableBackground.deleteMany({
        where: { jobPostingId: jobId },
      });

      // Create new ones
      const backgroundRelations =
        enrichedData.suitableBackgrounds.backgrounds.map(
          (background: string) => ({
            jobPostingId: jobId,
            background: background,
          })
        );

      await prisma.suitableBackground.createMany({
        data: backgroundRelations,
      });
    }
  }

  /**
   * Update Phase 3 data (geolocation, contact, research areas)
   */
  private async updatePhase3Data(
    jobId: number,
    enrichedData: EnrichedData
  ): Promise<void> {
    // GeoLocation
    if (
      enrichedData.geoLocation.confidence > 0.3 &&
      enrichedData.geoLocation.lat !== null &&
      enrichedData.geoLocation.lon !== null
    ) {
      await prisma.geoLocation.upsert({
        where: { jobPostingId: jobId },
        update: {
          lat: enrichedData.geoLocation.lat,
          lon: enrichedData.geoLocation.lon,
        },
        create: {
          jobPostingId: jobId,
          lat: enrichedData.geoLocation.lat,
          lon: enrichedData.geoLocation.lon,
        },
      });
    }

    // Contact
    if (
      enrichedData.contact.confidence > 0.3 &&
      (enrichedData.contact.name !== null ||
        enrichedData.contact.email !== null ||
        enrichedData.contact.title !== null)
    ) {
      await prisma.contact.upsert({
        where: { jobPostingId: jobId },
        update: {
          name: enrichedData.contact.name,
          email: enrichedData.contact.email,
          title: enrichedData.contact.title,
        },
        create: {
          jobPostingId: jobId,
          name: enrichedData.contact.name,
          email: enrichedData.contact.email,
          title: enrichedData.contact.title,
        },
      });
    }

    // Research Areas
    if (
      enrichedData.researchAreas.confidence > 0.3 &&
      enrichedData.researchAreas.researchAreas.length > 0
    ) {
      // Remove existing research area relationships
      await prisma.jobResearchArea.deleteMany({
        where: { jobPostingId: jobId },
      });

      // Upsert research areas and create relationships
      const researchAreaMap = new Map<string, number>();

      // Get existing research areas
      const existingResearchAreas = await prisma.researchArea.findMany({
        where: {
          name: { in: enrichedData.researchAreas.researchAreas },
        },
      });

      existingResearchAreas.forEach((area) => {
        researchAreaMap.set(area.name, area.id);
      });

      // Create new research areas
      for (const areaName of enrichedData.researchAreas.researchAreas) {
        if (!researchAreaMap.has(areaName)) {
          const newArea = await prisma.researchArea.create({
            data: { name: areaName },
          });
          researchAreaMap.set(areaName, newArea.id);
        }
      }

      // Create job-research area relationships
      const researchAreaRelations = enrichedData.researchAreas.researchAreas
        .map((areaName: string) => researchAreaMap.get(areaName))
        .filter((areaId): areaId is number => areaId !== undefined)
        .map((areaId: number) => ({
          jobPostingId: jobId,
          researchAreaId: areaId,
        }));

      if (researchAreaRelations.length > 0) {
        await prisma.jobResearchArea.createMany({
          data: researchAreaRelations,
        });
      }
    }
  }

  /**
   * Get current enrichment progress
   */
  async getProgress(): Promise<EnrichmentStats> {
    return await this.jobQueue.getEnrichmentProgress();
  }

  /**
   * Get detailed status of all jobs
   */
  async getAllJobStatuses() {
    return await this.jobQueue.getAllJobStatuses();
  }

  /**
   * Reset a failed job to pending for retry
   */
  async resetJobToPending(jobId: number): Promise<void> {
    return await this.jobQueue.resetJobToPending(jobId);
  }
}
