import type { LLMEnrichmentService } from "./llm-enrichment.interface";
import { LLMServiceFactory } from "./llm-service-factory";
import { LLMServiceUnavailableError } from "./llm-enrichment.interface";
import type { JobPosting } from "../types";

export class JobEnrichmentService {
  private llmService: LLMEnrichmentService | null;
  private serviceFactory: LLMServiceFactory;

  /**
   * Helper method to create a mock job object for legacy method compatibility
   */
  private createMockJob(overrides: Partial<JobPosting> = {}): JobPosting {
    return {
      id: 0,
      g: 0,
      name: "",
      description: "",
      qualifications: "",
      univ: "",
      url: "",
      deadline_raw: "",
      unit_name: "",
      disc: "",
      close_date_raw: "",
      salary: "",
      stat: 0,
      location: "",
      tag: "",
      instructions: "",
      open_date_raw: "",
      legacy_position_id: 0,
      apply: "",
      ...overrides,
    };
  }

  constructor() {
    this.serviceFactory = LLMServiceFactory.getInstance();
    this.llmService = this.serviceFactory.getPreferredService();

    if (this.llmService) {
      console.log(
        `✅ Job enrichment service initialized with ${this.llmService.getServiceName()}`
      );
    } else {
      console.log(
        "⚠️  No LLM service available, job enrichment will be skipped"
      );
    }
  }

  /**
   * Check if any LLM enrichment service is available
   */
  isAvailable(): boolean {
    return this.llmService !== null;
  }

  /**
   * Get information about available services
   */
  getServiceInfo() {
    return this.serviceFactory.getServiceInfo();
  }

  /**
   * Switch to a different LLM service
   */
  switchService(serviceName: string): boolean {
    const success = this.serviceFactory.setPreferredService(serviceName);
    if (success) {
      this.llmService = this.serviceFactory.getPreferredService();
    }
    return success;
  }

  /**
   * Enrich a single job with all available data
   */
  async enrichJob(job: JobPosting) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    try {
      console.log(`🤖 Enriching job: ${job.name}`);
      const enrichedData = await this.llmService.enrichJob(job);
      console.log(`✅ Job enrichment completed for: ${job.name}`);
      return enrichedData;
    } catch (error) {
      console.error(`❌ Failed to enrich job ${job.name}:`, error);
      throw error;
    }
  }

  /**
   * Enrich multiple jobs in batch
   */
  async enrichJobs(jobs: JobPosting[]) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    try {
      console.log(`🤖 Enriching ${jobs.length} jobs...`);
      const enrichedData = await this.llmService.enrichJobs(jobs);
      console.log(`✅ Batch job enrichment completed for ${jobs.length} jobs`);
      return enrichedData;
    } catch (error) {
      console.error(`❌ Failed to enrich jobs batch:`, error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractKeywords(
    title: string,
    description: string,
    qualifications: string
  ) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    // Create a mock job object for the legacy interface
    const mockJob = this.createMockJob({
      name: title,
      description: description,
      qualifications: qualifications,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        keywords: enrichedData.keywords,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract keywords:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractJobAttributes(
    title: string,
    description: string,
    salary: string
  ) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      name: title,
      description: description,
      salary: salary,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.jobAttributes,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract job attributes:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractJobDetails(
    title: string,
    description: string,
    salary: string,
    instructions: string,
    qualifications: string
  ) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      name: title,
      description: description,
      qualifications: qualifications,
      salary: salary,
      instructions: instructions,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.jobDetails,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract job details:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractApplicationRequirements(description: string) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      description: description,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.applicationRequirements,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract application requirements:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractLanguageRequirements(description: string) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      description: description,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.languageRequirements,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract language requirements:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractSuitableBackgrounds(description: string) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      description: description,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.suitableBackgrounds,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract suitable backgrounds:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractGeoLocation(
    title: string,
    description: string,
    location: string
  ) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      name: title,
      description: description,
      location: location,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.geoLocation,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract geolocation:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractContact(description: string, instructions: string) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      description: description,
      instructions: instructions,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.contact,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract contact information:", error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - now uses the new interface
   */
  async extractResearchAreas(title: string, description: string) {
    if (!this.llmService) {
      throw new LLMServiceUnavailableError("LLM Enrichment");
    }

    const mockJob = this.createMockJob({
      name: title,
      description: description,
    });

    try {
      const enrichedData = await this.llmService.enrichJob(mockJob);
      return {
        ...enrichedData.researchAreas,
        confidence: 1.0, // OpenAI structured output is reliable
      };
    } catch (error) {
      console.error("Failed to extract research areas:", error);
      throw error;
    }
  }
}
