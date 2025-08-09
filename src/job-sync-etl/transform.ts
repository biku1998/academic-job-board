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
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

// Initialize job enrichment service - Ollama first, then Cohere fallback
let jobEnrichmentService: JobEnrichmentService | null = null;
try {
  if (config.ollamaUrl || config.cohereApiKey) {
    jobEnrichmentService = new JobEnrichmentService();

    // Test service health if it's available
    if (jobEnrichmentService.isAvailable()) {
      console.log("🔍 Testing LLM service health...");
      // Note: Health check will be performed during first use to avoid blocking startup
    }
  } else {
    console.log(
      "⚠️  No OLLAMA_URL or COHERE_API_KEY found, skipping LLM enrichment"
    );
  }
} catch (error) {
  console.log("⚠️  Failed to initialize job enrichment service:", error);
}

// Configuration for parallel processing
const BATCH_SIZE = 10; // Process jobs in batches of 10

/**
 * Fallback keyword extraction when LLM is unavailable or fails
 */
const fallbackKeywordExtraction = (job: JobPosting): string[] => {
  return [
    ...extractKeywords(job.name),
    ...extractKeywords(job.description),
    ...extractKeywords(job.qualifications),
  ];
};

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

  // Extract keywords using LLM if available, otherwise fall back to manual extraction
  let keywords: string[] = [];
  if (jobEnrichmentService && job.description) {
    try {
      // Check service health before attempting extraction
      const isHealthy = await jobEnrichmentService.isHealthy();
      if (isHealthy) {
        console.log(`🔍 Extracting keywords for job: ${job.name}`);
        const keywordExtraction = await jobEnrichmentService.extractKeywords(
          job.name,
          job.description,
          job.qualifications
        );

        if (
          keywordExtraction.confidence > 0.3 &&
          keywordExtraction.keywords.length > 0
        ) {
          keywords = keywordExtraction.keywords;
          console.log(
            `✅ Extracted ${keywords.length} keywords with confidence: ${keywordExtraction.confidence}`
          );
        } else {
          console.log(
            `⚠️  Low confidence keyword extraction (${keywordExtraction.confidence}), using fallback`
          );
          // Fallback to manual extraction
          keywords = fallbackKeywordExtraction(job);
        }
      } else {
        console.warn(
          "⚠️  LLM service unhealthy, using fallback keyword extraction"
        );
        keywords = fallbackKeywordExtraction(job);
      }
    } catch (error) {
      console.warn(
        `❌ Failed to extract keywords for job ${job.name}, using fallback:`,
        error
      );
      // Fallback to manual extraction
      keywords = fallbackKeywordExtraction(job);
    }
  } else {
    // Manual extraction when LLM is not available
    keywords = fallbackKeywordExtraction(job);
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

  let jobDetailsData = {
    isSelfFinanced: null as boolean | null,
    isPartTime: null as boolean | null,
    workHoursPerWeek: null as number | null,
    compensationType: null as string | null,
  };

  const phase2Data = {
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

  const phase3Data = {
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

  if (jobEnrichmentService && job.description) {
    try {
      console.log(`🤖 Enriching job: ${job.name}`);

      // Extract job attributes (existing enrichment)
      const enrichedAttributes =
        await jobEnrichmentService.extractJobAttributes(
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
          `✅ Enriched job attributes with confidence: ${enrichedAttributes.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence job attributes enrichment (${enrichedAttributes.confidence}), skipping`
        );
      }

      // Extract job details (Phase 1: new fields)
      const jobDetails = await jobEnrichmentService.extractJobDetails(
        job.name,
        job.description,
        job.salary || "",
        job.instructions || "",
        job.qualifications || ""
      );

      if (jobDetails.confidence > 0.3) {
        jobDetailsData = {
          isSelfFinanced: jobDetails.isSelfFinanced,
          isPartTime: jobDetails.isPartTime,
          workHoursPerWeek: jobDetails.workHoursPerWeek,
          compensationType: jobDetails.compensationType,
        };
        console.log(
          `✅ Extracted job details with confidence: ${jobDetails.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence job details extraction (${jobDetails.confidence}), skipping`
        );
      }

      // Extract Phase 2 data (application requirements, language requirements, suitable backgrounds)
      const [applicationReqs, languageReqs, suitableBackgrounds] =
        await Promise.all([
          jobEnrichmentService.extractApplicationRequirements(job.description),
          jobEnrichmentService.extractLanguageRequirements(job.description),
          jobEnrichmentService.extractSuitableBackgrounds(job.description),
        ]);

      if (applicationReqs.confidence > 0.3) {
        phase2Data.applicationRequirements = {
          documentTypes: applicationReqs.documentTypes,
          referenceLettersRequired: applicationReqs.referenceLettersRequired,
          platform: applicationReqs.platform,
        };
        console.log(
          `✅ Extracted application requirements with confidence: ${applicationReqs.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence application requirements extraction (${applicationReqs.confidence}), skipping`
        );
      }

      if (languageReqs.confidence > 0.3) {
        phase2Data.languageRequirements = {
          languages: languageReqs.languages,
        };
        console.log(
          `✅ Extracted language requirements with confidence: ${languageReqs.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence language requirements extraction (${languageReqs.confidence}), skipping`
        );
      }

      if (suitableBackgrounds.confidence > 0.3) {
        phase2Data.suitableBackgrounds = {
          backgrounds: suitableBackgrounds.backgrounds,
        };
        console.log(
          `✅ Extracted suitable backgrounds with confidence: ${suitableBackgrounds.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence suitable backgrounds extraction (${suitableBackgrounds.confidence}), skipping`
        );
      }

      // Extract Phase 3 data (geolocation, contact, research areas)
      const [geoLocation, contact, researchAreas] = await Promise.all([
        jobEnrichmentService.extractGeoLocation(
          job.name,
          job.description,
          job.location
        ),
        jobEnrichmentService.extractContact(
          job.description,
          job.instructions || ""
        ),
        jobEnrichmentService.extractResearchAreas(job.name, job.description),
      ]);

      if (geoLocation.confidence > 0.3) {
        phase3Data.geoLocation = {
          lat: geoLocation.lat,
          lon: geoLocation.lon,
        };
        console.log(
          `✅ Extracted geolocation with confidence: ${geoLocation.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence geolocation extraction (${geoLocation.confidence}), skipping`
        );
      }

      if (contact.confidence > 0.3) {
        phase3Data.contact = {
          name: contact.name,
          email: contact.email,
          title: contact.title,
        };
        console.log(
          `✅ Extracted contact information with confidence: ${contact.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence contact extraction (${contact.confidence}), skipping`
        );
      }

      if (researchAreas.confidence > 0.3) {
        phase3Data.researchAreas = {
          researchAreas: researchAreas.researchAreas,
        };
        console.log(
          `✅ Extracted research areas with confidence: ${researchAreas.confidence}`
        );
      } else {
        console.log(
          `⚠️  Low confidence research areas extraction (${researchAreas.confidence}), skipping`
        );
      }
    } catch (error) {
      console.warn(`❌ Failed to enrich job ${job.name}:`, error);
    }
  }

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
        await new Promise((resolve) => setTimeout(resolve, 200));
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
  }

  const endTime = Date.now();
  console.log(
    `✅ Parallel transformation completed in ${endTime - startTime}ms`
  );

  return transformedData;
};
