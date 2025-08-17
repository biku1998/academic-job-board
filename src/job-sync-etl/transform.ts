import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import type { JobPosting, TransformedJob } from "./types";
import { parseDate, cleanHtml, determineJobType } from "./utils";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

// Initialize job enrichment service
let jobEnrichmentService: JobEnrichmentService | null = null;
try {
  jobEnrichmentService = new JobEnrichmentService();
  if (jobEnrichmentService.isAvailable()) {
    console.log("✅ Job enrichment service initialized");
  } else {
    console.log("⚠️  No LLM service available, skipping enrichment");
  }
} catch (error) {
  console.log("⚠️  Failed to initialize job enrichment service:", error);
}

// Configuration for parallel processing
const BATCH_SIZE = 20; // Process jobs in batches of 20 (optimized for OpenAI)

/**
 * Process a single job with enrichment
 */
const processJob = async (job: JobPosting) => {
  // Validate required fields
  if (!job.univ || !job.name || !job.url) {
    console.warn(`Skipping job with missing required fields:`, {
      id: job.id,
      univ: job.univ,
      name: job.name,
      url: job.url,
    });
    return null;
  }

  // Extract and normalize institution data
  const institutionKey = job.univ.toLowerCase().trim();
  const institutionData = {
    name: job.univ,
    location: job.location || null,
    website: null,
    type: null,
    description: null,
  };

  // Extract and normalize department data
  // Try to extract department from unit_name, or fall back to discipline if unit_name is empty
  const unitName =
    job.unit_name.trim() || job.disc.trim() || "General Department";

  // Debug logging for department extraction
  if (!job.unit_name.trim()) {
    console.log(
      `⚠️  Empty unit_name for job "${job.name}", using discipline: ${job.disc}`
    );
  }
  const departmentKey = `${institutionKey}-${unitName.toLowerCase().trim()}`;
  const departmentData = {
    name: unitName,
    location: job.location || null,
    contactInfo: null,
    institutionId: 0,
    institutionKey: institutionKey,
    description: null,
    website: null,
  };

  // Extract and normalize discipline data
  const disciplineKey = job.disc.toLowerCase().trim();
  const disciplineData = {
    name: job.disc,
    parentId: null,
  };

  // Extract enriched data using LLM enrichment service
  let keywords: string[] = [];
  let llmEnrichedData:
    | import("./services/llm-enrichment.interface").EnrichedJobData
    | null = null;

  if (jobEnrichmentService && job.description) {
    try {
      console.log(`🔍 Extracting enriched data for job: ${job.name}`);
      llmEnrichedData = await jobEnrichmentService.enrichJob(job);
      keywords = llmEnrichedData.keywords;
      console.log(
        `✅ Extracted ${keywords.length} keywords and comprehensive job data`
      );
    } catch (error) {
      console.warn(
        `❌ Failed to extract enriched data for job ${job.name}:`,
        error
      );
      // Fallback to empty keywords array
      keywords = [];
    }
  } else {
    // No enrichment service available
    keywords = [];
  }

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
    // Phase 1: New fields
    isSelfFinanced: null,
    isPartTime: null,
    workHoursPerWeek: null,
    compensationType: null,
    // Phase 2: New fields
    applicationRequirements: {
      documentTypes: [],
      referenceLettersRequired: null,
      platform: null,
    },
    languageRequirements: {
      languages: [],
    },
    suitableBackgrounds: {
      backgrounds: [],
    },
    // Phase 3: New fields
    geoLocation: {
      lat: null,
      lon: null,
    },
    contact: {
      name: null,
      email: null,
      title: null,
    },
    researchAreas: {
      researchAreas: [],
    },
    departmentKey: departmentKey,
    disciplineKey: disciplineKey,
    keywords: keywords,
    instructions: job.instructions,
    qualifications: job.qualifications,
    legacyPositionId: job.legacy_position_id,
  };

  // Use LLM enriched data if available, otherwise use defaults
  const enrichedData = llmEnrichedData
    ? {
        category: llmEnrichedData.jobAttributes.category,
        workModality: llmEnrichedData.jobAttributes.workModality,
        contractType: llmEnrichedData.jobAttributes.contractType,
        durationMonths: llmEnrichedData.jobAttributes.durationMonths,
        renewable: llmEnrichedData.jobAttributes.renewable,
        fundingSource: llmEnrichedData.jobAttributes.fundingSource,
        visaSponsorship: llmEnrichedData.jobAttributes.visaSponsorship,
        interviewProcess: llmEnrichedData.jobAttributes.interviewProcess,
      }
    : {
        category: null as string | null,
        workModality: null as string | null,
        contractType: null as string | null,
        durationMonths: null as number | null,
        renewable: null as boolean | null,
        fundingSource: null as string | null,
        visaSponsorship: null as boolean | null,
        interviewProcess: null as string | null,
      };

  const jobDetailsData = llmEnrichedData
    ? {
        isSelfFinanced: llmEnrichedData.jobDetails.isSelfFinanced,
        isPartTime: llmEnrichedData.jobDetails.isPartTime,
        workHoursPerWeek: llmEnrichedData.jobDetails.workHoursPerWeek,
        compensationType: llmEnrichedData.jobDetails.compensationType,
      }
    : {
        isSelfFinanced: null as boolean | null,
        isPartTime: null as boolean | null,
        workHoursPerWeek: null as number | null,
        compensationType: null as string | null,
      };

  const phase2Data = llmEnrichedData
    ? {
        applicationRequirements: {
          documentTypes: llmEnrichedData.applicationRequirements.documentTypes,
          referenceLettersRequired:
            llmEnrichedData.applicationRequirements.referenceLettersRequired,
          platform: llmEnrichedData.applicationRequirements.platform,
        },
        languageRequirements: {
          languages: llmEnrichedData.languageRequirements.languages,
        },
        suitableBackgrounds: {
          backgrounds: llmEnrichedData.suitableBackgrounds.backgrounds,
        },
      }
    : {
        applicationRequirements: {
          documentTypes: [] as string[],
          referenceLettersRequired: null as number | null,
          platform: null as string | null,
        },
        languageRequirements: {
          languages: [] as string[],
        },
        suitableBackgrounds: {
          backgrounds: [] as string[],
        },
      };

  const phase3Data = llmEnrichedData
    ? {
        geoLocation: {
          lat: llmEnrichedData.geoLocation.lat,
          lon: llmEnrichedData.geoLocation.lon,
        },
        contact: {
          name: llmEnrichedData.contact.name,
          email: llmEnrichedData.contact.email,
          title: llmEnrichedData.contact.title,
        },
        researchAreas: {
          researchAreas: llmEnrichedData.researchAreas.researchAreas,
        },
      }
    : {
        geoLocation: {
          lat: null as number | null,
          lon: null as number | null,
        },
        contact: {
          name: null as string | null,
          email: null as string | null,
          title: null as string | null,
        },
        researchAreas: {
          researchAreas: [] as string[],
        },
      };

  const transformedJob = {
    ...baseJob,
    ...enrichedData,
    ...jobDetailsData,
    ...phase2Data,
    ...phase3Data,
  };

  return {
    institution: { key: institutionKey, data: institutionData },
    department: { key: departmentKey, data: departmentData },
    discipline: { key: disciplineKey, data: disciplineData },
    jobPosting: transformedJob,
    keywords: keywords.map((keyword) => ({ name: keyword })),
    // Add enriched data for database population
    enrichedData: llmEnrichedData
      ? {
          applicationRequirements: phase2Data.applicationRequirements,
          languageRequirements: phase2Data.languageRequirements,
          suitableBackgrounds: phase2Data.suitableBackgrounds,
          geoLocation: phase3Data.geoLocation,
          contact: phase3Data.contact,
          researchAreas: phase3Data.researchAreas,
        }
      : null,
  };
};

/**
 * Process jobs in parallel with controlled concurrency
 */
const processJobsInParallel = async (jobs: JobPosting[]) => {
  const results: Array<Awaited<ReturnType<typeof processJob>>> = [];

  // Process jobs in batches to control memory usage
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    console.log(
      `🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        jobs.length / BATCH_SIZE
      )} (${batch.length} jobs)`
    );

    // Process batch with controlled concurrency
    const batchPromises = batch.map(async (job, index) => {
      // Add small delay to avoid overwhelming the LLM API
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Reduced delay for OpenAI
      }
      return processJob(job);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results.filter((result) => result !== null);
};

export const transformJobs = async (jobs: JobPosting[]) => {
  console.log(`🚀 Starting parallel transformation of ${jobs.length} jobs...`);
  const startTime = Date.now();

  // Process all jobs in parallel
  const processedJobs = await processJobsInParallel(jobs);

  // Consolidate results
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
    // Add enriched data for database population
    enrichedData: [] as Array<{
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
    } | null>,
  };

  // Consolidate all processed data
  for (const result of processedJobs) {
    if (!result) continue;

    // Add institution
    if (!transformedData.institutions.has(result.institution.key)) {
      transformedData.institutions.set(
        result.institution.key,
        result.institution.data
      );
    }

    // Add department
    if (!transformedData.departments.has(result.department.key)) {
      transformedData.departments.set(
        result.department.key,
        result.department.data
      );
    }

    // Add discipline
    if (!transformedData.disciplines.has(result.discipline.key)) {
      transformedData.disciplines.set(
        result.discipline.key,
        result.discipline.data
      );
    }

    // Add job posting
    transformedData.jobPostings.push(result.jobPosting);

    // Add keywords
    for (const keyword of result.keywords) {
      if (!transformedData.keywords.has(keyword.name)) {
        transformedData.keywords.set(keyword.name, keyword);
      }
    }

    // Add enriched data
    transformedData.enrichedData.push(result.enrichedData);
  }

  const endTime = Date.now();
  console.log(
    `✅ Parallel transformation completed in ${endTime - startTime}ms`
  );

  return transformedData;
};
