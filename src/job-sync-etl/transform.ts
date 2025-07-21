import { JobEnrichmentService } from "@/services/job-enrichment";
import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import { config } from "@/config";
import type { JobPosting, TransformedJob } from "./types";
import {
  parseDate,
  cleanHtml,
  extractKeywords,
  determineJobType,
} from "./utils";

// Initialize enrichment service if API key is available
let enrichmentService: JobEnrichmentService | null = null;
try {
  if (config.cohereApiKey) {
    enrichmentService = new JobEnrichmentService();
    console.log("✅ LLM enrichment service initialized with Cohere");
  } else {
    console.log("⚠️  No COHERE_API_KEY found, skipping LLM enrichment");
  }
} catch (error) {
  console.log("⚠️  Failed to initialize LLM enrichment service:", error);
}

export const transformJobs = async (jobs: JobPosting[]) => {
  const transformedData = {
    institutions: new Map<string, Omit<Institution, "id">>(),
    departments: new Map<
      string,
      Omit<Department, "id"> & { institutionKey: string }
    >(),
    disciplines: new Map<string, Omit<Discipline, "id">>(),
    jobPostings: [] as Array<
      Omit<
        TransformedJob,
        | "departmentId"
        | "disciplineId"
        | "status"
        | "lastSyncedAt"
        | "expiresAt"
        | "isActive"
      > & {
        departmentKey: string;
        disciplineKey: string;
        keywords: string[];
        instructions: string;
        qualifications: string;
        legacyPositionId: number;
        category?: string | null;
        workModality?: string | null;
        contractType?: string | null;
        durationMonths?: number | null;
        renewable?: boolean | null;
        fundingSource?: string | null;
        visaSponsorship?: boolean | null;
        interviewProcess?: string | null;
      }
    >,
    keywords: new Map<string, Omit<Keyword, "id">>(),
  };

  for (const job of jobs) {
    // Validate required fields
    if (!job.univ || !job.name || !job.url) {
      console.warn(`Skipping job with missing required fields:`, {
        id: job.id,
        univ: job.univ,
        name: job.name,
        url: job.url,
      });
      return;
    }

    // Extract and normalize institution data
    const institutionKey = job.univ.toLowerCase().trim();
    if (!transformedData.institutions.has(institutionKey)) {
      transformedData.institutions.set(institutionKey, {
        name: job.univ,
        location: job.location || null,
        website: null, // Not available in API
        type: null, // Not available in API
        description: null, // Not available in API
      });
    }

    // Extract and normalize department data
    // Handle empty unit_name by using a default or extracting from institution name
    const unitName = job.unit_name.trim() || "General Department";
    const departmentKey = `${institutionKey}-${unitName.toLowerCase().trim()}`;
    if (!transformedData.departments.has(departmentKey)) {
      transformedData.departments.set(departmentKey, {
        name: unitName,
        location: job.location || null,
        contactInfo: null, // Not available in API
        institutionId: 0, // Will be set when saving to DB
        institutionKey: institutionKey,
        description: null, // Not available in API
        website: null, // Not available in API
      });
    }

    // Extract and normalize discipline data
    const disciplineKey = job.disc.toLowerCase().trim();
    if (!transformedData.disciplines.has(disciplineKey)) {
      transformedData.disciplines.set(disciplineKey, {
        name: job.disc,
        parentId: null, // Would need logic to determine hierarchy
      });
    }

    // Extract keywords from title, description, and qualifications
    const keywords = [
      ...extractKeywords(job.name),
      ...extractKeywords(job.description),
      ...extractKeywords(job.qualifications),
    ];
    keywords.forEach((keyword) => {
      if (!transformedData.keywords.has(keyword)) {
        transformedData.keywords.set(keyword, { name: keyword });
      }
    });

    const { jobType, seniorityLevel } = determineJobType(job.name, job.tag);

    // Transform job posting using Prisma types with camelCase field names
    const baseJob = {
      title: job.name,
      descriptionHtml: job.description || null,
      descriptionText: cleanHtml(job.description) || null,
      category: null,
      seniorityLevel: seniorityLevel,
      jobType: jobType,
      workModality: null,
      salaryRange: job.salary || null,
      contractType: null,
      durationMonths: null,
      renewable: null,
      openDate: parseDate(job.open_date_raw),
      closeDate: parseDate(job.close_date_raw),
      deadlineDate: parseDate(job.deadline_raw),
      applicationLink: job.apply,
      sourceUrl: job.url,
      sourcePortal: "academic_jobs",
      fundingSource: null,
      visaSponsorship: null,
      interviewProcess: null,
      departmentKey: departmentKey,
      disciplineKey: disciplineKey,
      keywords: keywords,
      instructions: job.instructions,
      qualifications: job.qualifications,
      legacyPositionId: job.legacy_position_id,
    };

    let enrichedData = {
      category: null as string | null,
      workModality: null as string | null,
      contractType: null as string | null,
      durationMonths: null as number | null,
      renewable: null as boolean | null,
      fundingSource: null as string | null,
      visaSponsorship: null as boolean | null,
      interviewProcess: null as string | null,
    };

    if (enrichmentService && job.description) {
      try {
        console.log(`🤖 Enriching job: ${job.name}`);
        const enrichedAttributes = await enrichmentService.extractJobAttributes(
          job.name,
          job.description,
          job.salary || ""
        );
        if (enrichedAttributes.confidence > 0.5) {
          enrichedData = {
            category: enrichedAttributes.category || null,
            workModality: enrichedAttributes.workModality || null,
            contractType: enrichedAttributes.contractType || null,
            durationMonths: enrichedAttributes.durationMonths || null,
            renewable: enrichedAttributes.renewable || null,
            fundingSource: enrichedAttributes.fundingSource || null,
            visaSponsorship: enrichedAttributes.visaSponsorship || null,
            interviewProcess: enrichedAttributes.interviewProcess || null,
          };
          console.log(
            `✅ Enriched job with confidence: ${enrichedAttributes.confidence}`
          );
        } else {
          console.log(
            `⚠️  Low confidence enrichment (${enrichedAttributes.confidence}), skipping`
          );
        }
      } catch (error) {
        console.warn(`❌ Failed to enrich job ${job.name}:`, error);
      }
    }

    const transformedJob = {
      ...baseJob,
      ...enrichedData,
    };

    transformedData.jobPostings.push(transformedJob);
  }

  return transformedData;
};
