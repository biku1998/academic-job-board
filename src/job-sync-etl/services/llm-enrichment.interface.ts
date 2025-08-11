import type { JobPosting } from "../types";

// Enriched data structures
export interface EnrichedJobData {
  keywords: string[];
  jobAttributes: {
    category: string | null;
    workModality: string | null;
    contractType: string | null;
    durationMonths: number | null;
    renewable: boolean | null;
    fundingSource: string | null;
    visaSponsorship: boolean | null;
    interviewProcess: string | null;
  };
  jobDetails: {
    isSelfFinanced: boolean | null;
    isPartTime: boolean | null;
    workHoursPerWeek: number | null;
    compensationType: string | null;
  };
  applicationRequirements: {
    documentTypes: string[];
    referenceLettersRequired: number | null;
    platform: string | null;
  };
  languageRequirements: {
    languages: string[];
  };
  suitableBackgrounds: {
    backgrounds: string[];
  };
  geoLocation: {
    lat: number | null;
    lon: number | null;
  };
  contact: {
    name: string | null;
    email: string | null;
    title: string | null;
  };
  researchAreas: {
    researchAreas: string[];
  };
}

// Standard error types
export class LLMEnrichmentError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly jobId?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "LLMEnrichmentError";
  }
}

export class LLMServiceUnavailableError extends LLMEnrichmentError {
  constructor(serviceName: string) {
    super(`${serviceName} service is not available`, "service_check");
    this.name = "LLMServiceUnavailableError";
  }
}

export class LLMValidationError extends LLMEnrichmentError {
  constructor(
    message: string,
    operation: string,
    jobId?: number,
    public readonly validationErrors?: string[]
  ) {
    super(message, operation, jobId);
    this.name = "LLMValidationError";
  }
}

// Main interface
export interface LLMEnrichmentService {
  // Core enrichment method for single job
  enrichJob(job: JobPosting): Promise<EnrichedJobData>;

  // Batch processing for efficiency
  enrichJobs(jobs: JobPosting[]): Promise<EnrichedJobData[]>;

  // Utility methods
  isAvailable(): boolean;
  getSupportedFeatures(): string[];
  getServiceName(): string;
}
