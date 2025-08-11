import { z } from "zod";

// Job posting schema
export const JobPostingSchema = z.object({
  id: z.number(),
  g: z.number(),
  name: z.string(),
  univ: z.string(),
  url: z.string(),
  description: z.string(),
  deadline_raw: z.string(),
  unit_name: z.string(),
  disc: z.string(),
  close_date_raw: z.string(),
  salary: z.string(),
  stat: z.number(),
  location: z.string(),
  tag: z.string(),
  instructions: z.string(),
  open_date_raw: z.string(),
  legacy_position_id: z.number(),
  qualifications: z.string(),
  apply: z.string(),
});

export const JobListingResponseSchema = z.object({
  results: z.array(JobPostingSchema),
  hint: z.string(),
  limit: z.number(),
  page: z.number(),
  title: z.string(),
  unit_list: z.array(z.string()),
  count: z.number(),
  total_count: z.number(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

export type TransformedJob = {
  title: string;
  descriptionHtml: string | null;
  descriptionText: string | null;
  category: string | null;
  seniorityLevel: string | null;
  jobType: string | null;
  workModality: string | null;
  salaryRange: string | null;
  contractType: string | null;
  durationMonths: number | null;
  renewable: boolean | null;
  openDate: Date | null;
  closeDate: Date | null;
  deadlineDate: Date | null;
  applicationLink: string;
  sourceUrl: string;
  sourcePortal: string;
  fundingSource: string | null;
  visaSponsorship: boolean | null;
  interviewProcess: string | null;
  // Phase 1: New fields
  isSelfFinanced: boolean | null;
  isPartTime: boolean | null;
  workHoursPerWeek: number | null;
  compensationType: string | null;
  // Phase 2: New fields
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
  // Phase 3: New fields
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
  departmentKey: string;
  disciplineKey: string;
  keywords: string[];
  instructions: string;
  qualifications: string;
  legacyPositionId: number;
};

// Enrichment-related types
export interface EnrichmentStats {
  total: number;
  pending: number;
  enriched: number;
  failed: number;
  inProgress: number;
}

export interface JobEnrichmentStatus {
  id: number;
  title: string;
  enrichmentStatus: "pending" | "enriched" | "failed" | "in_progress";
  enrichmentError?: string | null;
  enrichedAt?: Date | null;
  lastAttemptAt?: Date | null;
  attemptCount: number;
}

export interface EnrichmentOptions {
  delayBetweenJobs?: number; // milliseconds between jobs
  maxJobsPerRun?: number; // maximum jobs to process in one run
  continueOnError?: boolean; // whether to continue processing if a job fails
}

// Interface for job data retrieved from database
export interface JobDataForEnrichment {
  id: number;
  title: string;
  descriptionText: string | null;
  descriptionHtml: string | null;
  salaryRange: string | null;
  instructions: string | null;
  qualifications: string | null;
}

// Interface for enriched data structure
export interface EnrichedData {
  keywords: {
    confidence: number;
    keywords: string[];
  };
  jobAttributes: {
    confidence: number;
    category?: string | null;
    workModality?: string | null;
    contractType?: string | null;
    durationMonths?: number | null;
    renewable?: boolean | null;
    fundingSource?: string | null;
    visaSponsorship?: boolean | null;
    interviewProcess?: string | null;
  };
  jobDetails: {
    confidence: number;
    isSelfFinanced?: boolean | null;
    isPartTime?: boolean | null;
    workHoursPerWeek?: number | null;
    compensationType?: string | null;
  };
  applicationReqs: {
    confidence: number;
    documentTypes: string[];
    referenceLettersRequired?: number | null;
    platform?: string | null;
  };
  languageReqs: {
    confidence: number;
    languages: string[];
  };
  suitableBackgrounds: {
    confidence: number;
    backgrounds: string[];
  };
  geoLocation: {
    confidence: number;
    lat: number | null;
    lon: number | null;
  };
  contact: {
    confidence: number;
    name?: string | null;
    email?: string | null;
    title?: string | null;
  };
  researchAreas: {
    confidence: number;
    researchAreas: string[];
  };
}
