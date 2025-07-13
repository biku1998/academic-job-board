import { PrismaClient } from "../generated/prisma";
import { z } from "zod";
import axios from "axios";
import { config } from "@/config";
import { htmlToText } from "html-to-text";
import { JobEnrichmentService } from "../services/jobEnrichment";
import type {
  Institution,
  Department,
  Discipline,
  JobPosting,
  Keyword,
  SyncLog,
} from "../generated/prisma";

const prisma = new PrismaClient();

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

const JobPostingSchema = z.object({
  id: z.number(),
  g: z.number(),
  name: z.string(),
  univ: z.string(),
  url: z.string().url(),
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
  apply: z.string().url(),
});

const JobListingResponseSchema = z.object({
  results: z.array(JobPostingSchema),
  hint: z.string(),
  limit: z.number(),
  page: z.number(),
  title: z.string(),
  unit_list: z.array(z.string()),
  count: z.number(),
  total_count: z.number(),
});

type ApiJobPosting = z.infer<typeof JobPostingSchema>;

const extractJobs = async () => {
  const jobPosts: ApiJobPosting[] = [];
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

      const validatedResponse = JobListingResponseSchema.parse(response.data);

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
      console.log("Waiting 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // DEV: Break after 4 pages for development
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

const transformJobs = async (jobs: ApiJobPosting[]) => {
  const transformedData = {
    institutions: new Map<string, Omit<Institution, "id">>(),
    departments: new Map<
      string,
      Omit<Department, "id"> & { institutionKey: string }
    >(),
    disciplines: new Map<string, Omit<Discipline, "id">>(),
    jobPostings: [] as Array<
      Omit<
        JobPosting,
        | "id"
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

    // Parse dates - handle invalid dates like '0000-00-00 00:00:00'
    const parseDate = (dateStr: string) => {
      if (!dateStr || dateStr === "0000-00-00 00:00:00") return null;

      // Handle different date formats from the API
      let parsedDate: Date;

      // Try parsing as ISO date first
      if (dateStr.includes("T") || dateStr.includes(" ")) {
        parsedDate = new Date(dateStr);
      } else {
        // Handle YYYY-MM-DD format
        parsedDate = new Date(dateStr + "T00:00:00");
      }

      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    };

    // Clean HTML content and extract plain text
    const cleanHtml = (html: string): string => {
      if (!html) return "";

      try {
        // Use html-to-text library with academic content optimized settings
        return htmlToText(html, {
          wordwrap: false, // Don't wrap words
          preserveNewlines: true, // Keep line breaks for readability
          selectors: [
            // Handle lists properly
            { selector: "ul", format: "unorderedList" },
            { selector: "ol", format: "orderedList" },
            // Handle headings individually
            { selector: "h1", format: "heading" },
            { selector: "h2", format: "heading" },
            { selector: "h3", format: "heading" },
            { selector: "h4", format: "heading" },
            { selector: "h5", format: "heading" },
            { selector: "h6", format: "heading" },
            // Handle paragraphs
            { selector: "p", format: "paragraph" },
            // Handle links but keep the text
            { selector: "a", format: "anchor" },
          ],
        }).trim();
      } catch (error) {
        console.warn("Failed to parse HTML, falling back to regex:", error);
        // Fallback to regex-based cleaning
        return html
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim();
      }
    };

    // Extract keywords from various fields with better logic
    const extractKeywords = (text: string): string[] => {
      if (!text) return [];

      const cleanText = cleanHtml(text).toLowerCase();

      // Common academic keywords to look for
      const academicKeywords = [
        "professor",
        "assistant",
        "associate",
        "postdoctoral",
        "postdoc",
        "fellow",
        "research",
        "teaching",
        "mathematics",
        "physics",
        "chemistry",
        "biology",
        "computer",
        "science",
        "engineering",
        "statistics",
        "data",
        "analysis",
        "machine",
        "learning",
        "artificial",
        "intelligence",
        "nuclear",
        "materials",
        "optical",
        "spectroscopy",
        "experimental",
        "theoretical",
        "computational",
        "phd",
        "doctoral",
        "graduate",
        "undergraduate",
        "faculty",
        "tenure",
        "laboratory",
        "institute",
        "university",
        "college",
        "department",
      ];

      // Find academic keywords in the text
      const foundKeywords = academicKeywords.filter((keyword) =>
        cleanText.includes(keyword)
      );

      // Also extract meaningful words (3+ characters, not common words)
      const commonWords = [
        "the",
        "and",
        "for",
        "with",
        "this",
        "that",
        "have",
        "will",
        "from",
        "are",
        "was",
        "were",
        "been",
        "being",
        "has",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "must",
        "can",
        "shall",
      ];

      const words = cleanText
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 &&
            !commonWords.includes(word) &&
            !foundKeywords.includes(word)
        )
        .slice(0, 5); // Limit additional words

      return [...new Set([...foundKeywords, ...words])]; // Remove duplicates
    };

    // Extract keywords from title, description, and qualifications
    const keywords = [
      ...extractKeywords(job.name),
      ...extractKeywords(job.description),
      ...extractKeywords(job.qualifications),
    ];

    // Add keywords to the map
    keywords.forEach((keyword) => {
      if (!transformedData.keywords.has(keyword)) {
        transformedData.keywords.set(keyword, { name: keyword });
      }
    });

    // Determine job type and seniority level from title and tag
    const determineJobType = (
      title: string,
      tag: string
    ): { jobType: string | null; seniorityLevel: string | null } => {
      const lowerTitle = title.toLowerCase();
      const lowerTag = tag.toLowerCase();

      let jobType: string | null = null;
      let seniorityLevel: string | null = null;

      // Check tag first as it's more reliable
      if (lowerTag.includes("postdoc") || lowerTag.includes("fellow")) {
        jobType = "Postdoctoral";
        seniorityLevel = "Postdoctoral";
      } else if (lowerTag.includes("assistantprofessor")) {
        jobType = "Faculty";
        seniorityLevel = "Assistant Professor";
      } else if (lowerTag.includes("associateprofessor")) {
        jobType = "Faculty";
        seniorityLevel = "Associate Professor";
      } else if (lowerTag.includes("professor")) {
        jobType = "Faculty";
        seniorityLevel = "Professor";
      } else if (
        lowerTag.includes("lecturer") ||
        lowerTag.includes("instructor")
      ) {
        jobType = "Faculty";
        seniorityLevel = "Lecturer";
      } else if (lowerTag.includes("research")) {
        jobType = "Research";
        seniorityLevel = "Research Staff";
      } else {
        // Fallback to title analysis
        if (
          lowerTitle.includes("postdoctoral") ||
          lowerTitle.includes("postdoc") ||
          lowerTitle.includes("fellow")
        ) {
          jobType = "Postdoctoral";
          seniorityLevel = "Postdoctoral";
        } else if (lowerTitle.includes("assistant professor")) {
          jobType = "Faculty";
          seniorityLevel = "Assistant Professor";
        } else if (lowerTitle.includes("associate professor")) {
          jobType = "Faculty";
          seniorityLevel = "Associate Professor";
        } else if (
          lowerTitle.includes("professor") &&
          !lowerTitle.includes("assistant") &&
          !lowerTitle.includes("associate")
        ) {
          jobType = "Faculty";
          seniorityLevel = "Professor";
        } else if (
          lowerTitle.includes("lecturer") ||
          lowerTitle.includes("instructor")
        ) {
          jobType = "Faculty";
          seniorityLevel = "Lecturer";
        } else if (lowerTitle.includes("research")) {
          jobType = "Research";
          seniorityLevel = "Research Staff";
        }
      }

      return { jobType, seniorityLevel };
    };

    const { jobType, seniorityLevel } = determineJobType(job.name, job.tag);

    // Transform job posting using Prisma types with camelCase field names
    const baseJob = {
      title: job.name,
      descriptionHtml: job.description || null, // Keep HTML for rich display
      descriptionText: cleanHtml(job.description) || null, // Clean text version
      category: null, // Will be enriched by LLM
      seniorityLevel: seniorityLevel,
      jobType: jobType,
      workModality: null, // Will be enriched by LLM
      salaryRange: job.salary || null,
      contractType: null, // Will be enriched by LLM
      durationMonths: null, // Will be enriched by LLM
      renewable: null, // Will be enriched by LLM
      openDate: parseDate(job.open_date_raw),
      closeDate: parseDate(job.close_date_raw),
      deadlineDate: parseDate(job.deadline_raw),
      applicationLink: job.apply,
      sourceUrl: job.url,
      sourcePortal: "academic_jobs", // Assuming this is the source
      fundingSource: null, // Will be enriched by LLM
      visaSponsorship: null, // Will be enriched by LLM
      interviewProcess: null, // Will be enriched by LLM
      departmentKey: departmentKey,
      disciplineKey: disciplineKey,
      keywords: keywords,
      instructions: job.instructions,
      qualifications: job.qualifications,
      legacyPositionId: job.legacy_position_id,
    };

    // Enrich job data with LLM if available
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

        // Extract job attributes
        const enrichedAttributes = await enrichmentService.extractJobAttributes(
          job.name,
          job.description,
          job.salary || ""
        );

        // Update job data with enriched attributes
        if (enrichedAttributes.confidence > 0.5) {
          // Only use if confident
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

    // Create final transformed job with enrichment data
    const transformedJob: Omit<
      JobPosting,
      | "id"
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
    } = {
      ...baseJob,
      ...enrichedData,
    };

    transformedData.jobPostings.push(transformedJob);
  }

  return transformedData;
};

// New utility functions for status management
const calculateExpiresAt = (
  closeDate: Date | null,
  deadlineDate: Date | null
): Date | null => {
  if (deadlineDate) return deadlineDate;
  if (closeDate) return closeDate;
  return null;
};

const markExpiredJobs = async (): Promise<number> => {
  const now = new Date();

  const result = await prisma.jobPosting.updateMany({
    where: {
      OR: [
        { closeDate: { lt: now } },
        { deadlineDate: { lt: now } },
        { expiresAt: { lt: now } },
      ],
      status: "active",
    },
    data: {
      status: "expired",
      isActive: false,
    },
  });

  return result.count;
};

const markRemovedJobs = async (
  currentJobUrls: Set<string>
): Promise<number> => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.jobPosting.updateMany({
    where: {
      sourceUrl: { notIn: Array.from(currentJobUrls) },
      status: "active",
      lastSyncedAt: { lt: oneDayAgo },
    },
    data: {
      status: "removed",
      isActive: false,
    },
  });

  return result.count;
};

const archiveOldJobs = async (): Promise<number> => {
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const result = await prisma.jobPosting.updateMany({
    where: {
      status: { in: ["expired", "removed"] },
      lastSyncedAt: { lt: sixMonthsAgo },
    },
    data: {
      isActive: false,
    },
  });

  return result.count;
};

// Enhanced loadJobs function with status management and sync logging
const loadJobs = async (
  transformedData: Awaited<ReturnType<typeof transformJobs>>
) => {
  console.log("Starting to load data to database...");

  // Type guard to ensure transformedData is defined
  if (!transformedData) {
    throw new Error("Transformed data is undefined");
  }

  const stats = {
    institutions: 0,
    departments: 0,
    disciplines: 0,
    keywords: 0,
    jobPostings: 0,
    jobKeywords: 0,
    jobsCreated: 0,
    jobsUpdated: 0,
    errors: [] as string[],
  };

  try {
    // 1. Load institutions
    console.log("Loading institutions...");
    const institutionMap = new Map<string, number>();

    for (const [key, institutionData] of transformedData.institutions) {
      try {
        // Check if institution exists by name
        let institution = await prisma.institution.findFirst({
          where: { name: institutionData.name },
        });

        if (institution) {
          // Update existing institution
          institution = await prisma.institution.update({
            where: { id: institution.id },
            data: {
              location: institutionData.location,
              website: institutionData.website,
              type: institutionData.type,
            },
          });
        } else {
          // Create new institution
          institution = await prisma.institution.create({
            data: institutionData,
          });
        }

        institutionMap.set(key, institution.id);
        stats.institutions++;
      } catch (error) {
        const errorMsg = `Error processing institution ${institutionData.name}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    // 2. Load departments
    console.log("Loading departments...");
    const departmentMap = new Map<string, number>();

    for (const [key, departmentData] of transformedData.departments) {
      try {
        const institutionId = institutionMap.get(departmentData.institutionKey);
        if (!institutionId) {
          console.warn(
            `Institution not found for department: ${departmentData.name}`
          );
          continue;
        }

        // Check if department exists by name and institution
        let department = await prisma.department.findFirst({
          where: {
            name: departmentData.name,
            institutionId: institutionId,
          },
        });

        if (department) {
          // Update existing department
          department = await prisma.department.update({
            where: { id: department.id },
            data: {
              location: departmentData.location,
              contactInfo: departmentData.contactInfo,
            },
          });
        } else {
          // Create new department
          department = await prisma.department.create({
            data: {
              name: departmentData.name,
              location: departmentData.location,
              contactInfo: departmentData.contactInfo,
              institutionId: institutionId,
            },
          });
        }

        departmentMap.set(key, department.id);
        stats.departments++;
      } catch (error) {
        const errorMsg = `Error processing department ${departmentData.name}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    // 3. Load disciplines
    console.log("Loading disciplines...");
    const disciplineMap = new Map<string, number>();

    for (const [key, disciplineData] of transformedData.disciplines) {
      try {
        // Check if discipline exists by name
        let discipline = await prisma.discipline.findFirst({
          where: { name: disciplineData.name },
        });

        if (discipline) {
          // Update existing discipline
          discipline = await prisma.discipline.update({
            where: { id: discipline.id },
            data: {
              parentId: disciplineData.parentId,
            },
          });
        } else {
          // Create new discipline
          discipline = await prisma.discipline.create({
            data: disciplineData,
          });
        }

        disciplineMap.set(key, discipline.id);
        stats.disciplines++;
      } catch (error) {
        const errorMsg = `Error processing discipline ${disciplineData.name}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    // 4. Load keywords
    console.log("Loading keywords...");
    const keywordMap = new Map<string, number>();

    for (const [key, keywordData] of transformedData.keywords) {
      try {
        // Check if keyword exists by name (unique constraint)
        let keyword = await prisma.keyword.findUnique({
          where: { name: keywordData.name },
        });

        if (!keyword) {
          // Create new keyword
          keyword = await prisma.keyword.create({
            data: keywordData,
          });
        }

        keywordMap.set(key, keyword.id);
        stats.keywords++;
      } catch (error) {
        const errorMsg = `Error processing keyword ${keywordData.name}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    // 5. Load job postings and their relationships
    console.log("Loading job postings...");

    for (const jobData of transformedData.jobPostings) {
      try {
        const departmentId = departmentMap.get(jobData.departmentKey);
        const disciplineId = disciplineMap.get(jobData.disciplineKey);

        if (!departmentId || !disciplineId) {
          console.warn(
            `Department or discipline not found for job: ${jobData.title}`
          );
          continue;
        }

        // Calculate expiresAt
        const expiresAt = calculateExpiresAt(
          jobData.closeDate,
          jobData.deadlineDate
        );

        // Check if job already exists by source URL
        const existingJob = await prisma.jobPosting.findFirst({
          where: {
            sourceUrl: jobData.sourceUrl,
          },
        });

        if (existingJob) {
          console.log(`Updating existing job: ${jobData.title}`);
          // Update existing job
          await prisma.jobPosting.update({
            where: { id: existingJob.id },
            data: {
              title: jobData.title,
              descriptionHtml: jobData.descriptionHtml,
              descriptionText: jobData.descriptionText,
              category: jobData.category,
              seniorityLevel: jobData.seniorityLevel,
              jobType: jobData.jobType,
              workModality: jobData.workModality,
              salaryRange: jobData.salaryRange,
              contractType: jobData.contractType,
              durationMonths: jobData.durationMonths,
              renewable: jobData.renewable,
              openDate: jobData.openDate,
              closeDate: jobData.closeDate,
              deadlineDate: jobData.deadlineDate,
              applicationLink: jobData.applicationLink,
              sourceUrl: jobData.sourceUrl,
              sourcePortal: jobData.sourcePortal,
              fundingSource: jobData.fundingSource,
              visaSponsorship: jobData.visaSponsorship,
              interviewProcess: jobData.interviewProcess,
              departmentId: departmentId,
              disciplineId: disciplineId,
              status: "active",
              isActive: true,
              lastSyncedAt: new Date(),
              expiresAt: expiresAt,
            },
          });
          stats.jobsUpdated++;
        } else {
          console.log(`Creating new job: ${jobData.title}`);
          // Create new job
          const jobPosting = await prisma.jobPosting.create({
            data: {
              title: jobData.title,
              descriptionHtml: jobData.descriptionHtml,
              descriptionText: jobData.descriptionText,
              category: jobData.category,
              seniorityLevel: jobData.seniorityLevel,
              jobType: jobData.jobType,
              workModality: jobData.workModality,
              salaryRange: jobData.salaryRange,
              contractType: jobData.contractType,
              durationMonths: jobData.durationMonths,
              renewable: jobData.renewable,
              openDate: jobData.openDate,
              closeDate: jobData.closeDate,
              deadlineDate: jobData.deadlineDate,
              applicationLink: jobData.applicationLink,
              sourceUrl: jobData.sourceUrl,
              sourcePortal: jobData.sourcePortal,
              fundingSource: jobData.fundingSource,
              visaSponsorship: jobData.visaSponsorship,
              interviewProcess: jobData.interviewProcess,
              departmentId: departmentId,
              disciplineId: disciplineId,
              status: "active",
              isActive: true,
              lastSyncedAt: new Date(),
              expiresAt: expiresAt,
            },
          });

          // 6. Create job-keyword relationships
          for (const keywordName of jobData.keywords) {
            try {
              const keywordId = keywordMap.get(keywordName);
              if (keywordId) {
                // Check if relationship already exists
                const existingRelation = await prisma.jobKeyword.findUnique({
                  where: {
                    jobPostingId_keywordId: {
                      jobPostingId: jobPosting.id,
                      keywordId: keywordId,
                    },
                  },
                });

                if (!existingRelation) {
                  await prisma.jobKeyword.create({
                    data: {
                      jobPostingId: jobPosting.id,
                      keywordId: keywordId,
                    },
                  });
                  stats.jobKeywords++;
                }
              }
            } catch (error) {
              const errorMsg = `Error creating job-keyword relationship for ${keywordName}: ${error}`;
              console.error(errorMsg);
              stats.errors.push(errorMsg);
            }
          }

          stats.jobsCreated++;
        }
        stats.jobPostings++;
      } catch (error) {
        const errorMsg = `Error processing job ${jobData.title}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
      }
    }

    console.log("✅ Data loaded successfully!");
    console.log("📊 Statistics:", stats);

    return stats;
  } catch (error) {
    console.error("❌ Error loading data to database:", error);
    throw error;
  }
};

// Enhanced main function with sync logging and status management
const main = async () => {
  const syncStartTime = Date.now();
  let syncLog: SyncLog | null = null;

  try {
    console.log("Starting job sync...");

    // Create sync log entry
    syncLog = await prisma.syncLog.create({
      data: {
        status: "running",
        jobsFetched: 0,
        jobsCreated: 0,
        jobsUpdated: 0,
        jobsExpired: 0,
        jobsRemoved: 0,
      },
    });

    // Extract jobs
    const jobs = await extractJobs();
    console.log(`Fetched ${jobs.length} jobs from API`);

    // Update sync log with fetched count
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { jobsFetched: jobs.length },
    });

    // Transform the jobs to match database schema
    const transformedData = await transformJobs(jobs);
    if (!transformedData) {
      throw new Error("Failed to transform job data");
    }

    console.log(`Transformed data:`, {
      institutions: transformedData.institutions.size,
      departments: transformedData.departments.size,
      disciplines: transformedData.disciplines.size,
      jobPostings: transformedData.jobPostings.length,
      keywords: transformedData.keywords.size,
    });

    // Load the data to the database
    const loadStats = await loadJobs(transformedData);

    // Handle job status management
    console.log("Managing job status...");
    const expiredCount = await markExpiredJobs();
    console.log(`Marked ${expiredCount} jobs as expired`);

    // Mark jobs as removed if they're not in current sync
    const currentJobUrls = new Set(jobs.map((job) => job.url));
    const removedCount = await markRemovedJobs(currentJobUrls);
    console.log(`Marked ${removedCount} jobs as removed`);

    // Archive old jobs (optional - run less frequently)
    const archivedCount = await archiveOldJobs();
    console.log(`Archived ${archivedCount} old jobs`);

    // Update sync log with final stats
    const syncEndTime = Date.now();
    const durationMs = syncEndTime - syncStartTime;

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: loadStats.errors.length > 0 ? "partial" : "success",
        jobsCreated: loadStats.jobsCreated,
        jobsUpdated: loadStats.jobsUpdated,
        jobsExpired: expiredCount,
        jobsRemoved: removedCount,
        errors:
          loadStats.errors.length > 0 ? JSON.stringify(loadStats.errors) : null,
        completedAt: new Date(),
        durationMs: durationMs,
      },
    });

    console.log(`✅ Sync completed in ${durationMs}ms`);
    console.log(
      `📊 Final stats: Created ${loadStats.jobsCreated}, Updated ${loadStats.jobsUpdated}, Expired ${expiredCount}, Removed ${removedCount}`
    );
  } catch (error) {
    console.error("Failed to sync jobs:", error);

    // Update sync log with error
    if (syncLog) {
      const syncEndTime = Date.now();
      const durationMs = syncEndTime - syncStartTime;

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errors: JSON.stringify([
            error instanceof Error ? error.message : String(error),
          ]),
          completedAt: new Date(),
          durationMs: durationMs,
        },
      });
    }
  }
};

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
