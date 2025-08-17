import { PrismaClient } from "@/generated/prisma";
import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import type { TransformedJob } from "./types";

const prisma = new PrismaClient();

// Configuration for batch processing
const BATCH_SIZE = 50; // Process database operations in batches

/**
 * Batch upsert institutions
 */
const batchUpsertInstitutions = async (
  institutions: Map<string, Omit<Institution, "id">>
) => {
  const institutionMap = new Map<string, number>();
  const institutionData = Array.from(institutions.values());

  console.log(`📦 Batch upserting ${institutionData.length} institutions...`);

  // Get existing institutions
  const existingInstitutions = await prisma.institution.findMany({
    where: {
      name: { in: institutionData.map((inst) => inst.name) },
    },
  });

  const existingMap = new Map(
    existingInstitutions.map((inst) => [inst.name, inst])
  );

  // Prepare upsert operations
  const upsertPromises = institutionData.map(async (institutionData) => {
    const existing = existingMap.get(institutionData.name);

    if (existing) {
      // Update existing
      const updated = await prisma.institution.update({
        where: { id: existing.id },
        data: {
          location: institutionData.location,
          website: institutionData.website,
          type: institutionData.type,
          description: institutionData.description,
        },
      });
      return { key: institutionData.name.toLowerCase().trim(), id: updated.id };
    } else {
      // Create new
      const created = await prisma.institution.create({
        data: institutionData,
      });
      return { key: institutionData.name.toLowerCase().trim(), id: created.id };
    }
  });

  const results = await Promise.all(upsertPromises);
  results.forEach((result) => institutionMap.set(result.key, result.id));

  return institutionMap;
};

/**
 * Batch upsert departments
 */
const batchUpsertDepartments = async (
  departments: Map<string, Omit<Department, "id"> & { institutionKey: string }>,
  institutionMap: Map<string, number>
) => {
  const departmentMap = new Map<string, number>();
  const departmentData = Array.from(departments.values());

  console.log(`📦 Batch upserting ${departmentData.length} departments...`);

  // Get existing departments
  const existingDepartments = await prisma.department.findMany({
    where: {
      OR: departmentData.map((dept) => ({
        name: dept.name,
        institutionId: institutionMap.get(dept.institutionKey) || 0,
      })),
    },
    include: { institution: true },
  });

  const existingMap = new Map(
    existingDepartments.map((dept) => [
      `${dept.institution.name}-${dept.name}`,
      dept,
    ])
  );

  // Prepare upsert operations
  const upsertPromises = departmentData.map(async (departmentData) => {
    const institutionId = institutionMap.get(departmentData.institutionKey);
    if (!institutionId) {
      console.warn(
        `Institution not found for department: ${departmentData.name}`
      );
      return null;
    }

    const existing = existingMap.get(
      `${departmentData.institutionKey}-${departmentData.name}`
    );

    if (existing) {
      // Update existing
      const updated = await prisma.department.update({
        where: { id: existing.id },
        data: {
          location: departmentData.location,
          contactInfo: departmentData.contactInfo,
          description: departmentData.description,
          website: departmentData.website,
        },
      });
      return {
        key: `${departmentData.institutionKey}-${departmentData.name
          .toLowerCase()
          .trim()}`,
        id: updated.id,
      };
    } else {
      // Create new
      const created = await prisma.department.create({
        data: {
          name: departmentData.name,
          location: departmentData.location,
          contactInfo: departmentData.contactInfo,
          institutionId: institutionId,
          description: departmentData.description,
          website: departmentData.website,
        },
      });
      return {
        key: `${departmentData.institutionKey}-${departmentData.name
          .toLowerCase()
          .trim()}`,
        id: created.id,
      };
    }
  });

  const results = await Promise.all(upsertPromises);
  results
    .filter((result) => result !== null)
    .forEach((result) => {
      if (result) departmentMap.set(result.key, result.id);
    });

  return departmentMap;
};

/**
 * Batch upsert disciplines
 */
const batchUpsertDisciplines = async (
  disciplines: Map<string, Omit<Discipline, "id">>
) => {
  const disciplineMap = new Map<string, number>();
  const disciplineData = Array.from(disciplines.values());

  console.log(`📦 Batch upserting ${disciplineData.length} disciplines...`);

  // Get existing disciplines
  const existingDisciplines = await prisma.discipline.findMany({
    where: {
      name: { in: disciplineData.map((disc) => disc.name) },
    },
  });

  const existingMap = new Map(
    existingDisciplines.map((disc) => [disc.name, disc])
  );

  // Prepare upsert operations
  const upsertPromises = disciplineData.map(async (disciplineData) => {
    const existing = existingMap.get(disciplineData.name);

    if (existing) {
      // Update existing
      const updated = await prisma.discipline.update({
        where: { id: existing.id },
        data: {
          parentId: disciplineData.parentId,
        },
      });
      return { key: disciplineData.name.toLowerCase().trim(), id: updated.id };
    } else {
      // Create new
      const created = await prisma.discipline.create({
        data: disciplineData,
      });
      return { key: disciplineData.name.toLowerCase().trim(), id: created.id };
    }
  });

  const results = await Promise.all(upsertPromises);
  results.forEach((result) => disciplineMap.set(result.key, result.id));

  return disciplineMap;
};

/**
 * Batch upsert keywords
 */
const batchUpsertKeywords = async (
  keywords: Map<string, Omit<Keyword, "id">>
) => {
  const keywordMap = new Map<string, number>();
  const keywordData = Array.from(keywords.values());

  console.log(`📦 Batch upserting ${keywordData.length} keywords...`);

  // Get existing keywords
  const existingKeywords = await prisma.keyword.findMany({
    where: {
      name: { in: keywordData.map((kw) => kw.name) },
    },
  });

  const existingMap = new Map(existingKeywords.map((kw) => [kw.name, kw]));

  // Prepare upsert operations
  const upsertPromises = keywordData.map(async (keywordData) => {
    const existing = existingMap.get(keywordData.name);

    if (existing) {
      return { key: keywordData.name, id: existing.id };
    } else {
      // Create new
      const created = await prisma.keyword.create({
        data: keywordData,
      });
      return { key: keywordData.name, id: created.id };
    }
  });

  const results = await Promise.all(upsertPromises);
  results.forEach((result) => keywordMap.set(result.key, result.id));

  return keywordMap;
};

/**
 * Batch upsert job postings
 */
const batchUpsertJobPostings = async (
  jobPostings: Array<TransformedJob>,
  enrichedData: Array<{
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
  departmentMap: Map<string, number>,
  disciplineMap: Map<string, number>,
  keywordMap: Map<string, number>
) => {
  console.log(`📦 Batch upserting ${jobPostings.length} job postings...`);

  const stats = {
    jobsCreated: 0,
    jobsUpdated: 0,
    jobKeywords: 0,
    errors: [] as string[],
    pendingResearchAreas: [] as Array<{
      jobPostingId: number;
      researchAreaName: string;
    }>,
  };

  // Get existing jobs by source URL
  const sourceUrls = jobPostings.map((job) => job.sourceUrl).filter(Boolean);
  const existingJobs = await prisma.jobPosting.findMany({
    where: {
      sourceUrl: { in: sourceUrls },
    },
  });

  const existingMap = new Map(existingJobs.map((job) => [job.sourceUrl, job]));

  // Process job postings in batches
  for (let i = 0; i < jobPostings.length; i += BATCH_SIZE) {
    const batch = jobPostings.slice(i, i + BATCH_SIZE);
    console.log(
      `🔄 Processing job batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        jobPostings.length / BATCH_SIZE
      )}`
    );

    const batchPromises = batch.map(async (jobData, index) => {
      const jobIndex = i + index;
      const jobEnrichedData = enrichedData[jobIndex];
      try {
        const departmentId = departmentMap.get(jobData.departmentKey);
        const disciplineId = disciplineMap.get(jobData.disciplineKey);

        if (!departmentId || !disciplineId) {
          console.warn(
            `Department or discipline not found for job: ${jobData.title}`
          );
          return null;
        }

        const expiresAt = jobData.closeDate || jobData.deadlineDate || null;
        const existingJob = existingMap.get(jobData.sourceUrl || "");

        const jobDataForDb = {
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
          // Phase 1: New fields
          isSelfFinanced: jobData.isSelfFinanced,
          isPartTime: jobData.isPartTime,
          workHoursPerWeek: jobData.workHoursPerWeek,
          compensationType: jobData.compensationType,
          departmentId: departmentId,
          disciplineId: disciplineId,
          status: "active" as const,
          isActive: true,
          lastSyncedAt: new Date(),
          expiresAt: expiresAt,
        };

        let jobPosting: Awaited<ReturnType<typeof prisma.jobPosting.create>>;
        if (existingJob) {
          // Update existing
          jobPosting = await prisma.jobPosting.update({
            where: { id: existingJob.id },
            data: jobDataForDb,
          });
          stats.jobsUpdated++;
        } else {
          // Create new
          jobPosting = await prisma.jobPosting.create({
            data: jobDataForDb,
          });
          stats.jobsCreated++;

          // Create job-keyword relationships
          const keywordRelations = jobData.keywords
            .map((keywordName) => keywordMap.get(keywordName))
            .filter(Boolean)
            .map((keywordId) => ({
              jobPostingId: jobPosting.id,
              keywordId: keywordId!,
            }));

          if (keywordRelations.length > 0) {
            await prisma.jobKeyword.createMany({
              data: keywordRelations,
              skipDuplicates: true,
            });
            stats.jobKeywords += keywordRelations.length;
          }

          // Create enriched data relationships using LLM data (only for new jobs)
          if (jobEnrichedData) {
            // Application Requirements
            if (
              jobEnrichedData.applicationRequirements.documentTypes.length >
                0 ||
              jobEnrichedData.applicationRequirements
                .referenceLettersRequired !== null ||
              jobEnrichedData.applicationRequirements.platform !== null
            ) {
              await prisma.applicationRequirement.create({
                data: {
                  jobPostingId: jobPosting.id,
                  documentType:
                    jobEnrichedData.applicationRequirements.documentTypes.join(
                      ", "
                    ),
                  referenceLettersRequired:
                    jobEnrichedData.applicationRequirements
                      .referenceLettersRequired,
                  platform: jobEnrichedData.applicationRequirements.platform,
                  description: `Documents: ${jobEnrichedData.applicationRequirements.documentTypes.join(
                    ", "
                  )}`,
                },
              });
            }

            // Language Requirements
            if (jobEnrichedData.languageRequirements.languages.length > 0) {
              const languageRelations =
                jobEnrichedData.languageRequirements.languages.map(
                  (language) => ({
                    jobPostingId: jobPosting.id,
                    language: language,
                  })
                );

              await prisma.languageRequirement.createMany({
                data: languageRelations,
                skipDuplicates: true,
              });
            }

            // Suitable Backgrounds
            if (jobEnrichedData.suitableBackgrounds.backgrounds.length > 0) {
              const backgroundRelations =
                jobEnrichedData.suitableBackgrounds.backgrounds.map(
                  (background) => ({
                    jobPostingId: jobPosting.id,
                    background: background,
                  })
                );

              await prisma.suitableBackground.createMany({
                data: backgroundRelations,
                skipDuplicates: true,
              });
            }

            // GeoLocation
            if (
              jobEnrichedData.geoLocation.lat !== null &&
              jobEnrichedData.geoLocation.lon !== null
            ) {
              await prisma.geoLocation.create({
                data: {
                  jobPostingId: jobPosting.id,
                  lat: jobEnrichedData.geoLocation.lat,
                  lon: jobEnrichedData.geoLocation.lon,
                },
              });
            }

            // Contact
            if (
              jobEnrichedData.contact.name !== null ||
              jobEnrichedData.contact.email !== null ||
              jobEnrichedData.contact.title !== null
            ) {
              await prisma.contact.create({
                data: {
                  jobPostingId: jobPosting.id,
                  name: jobEnrichedData.contact.name,
                  email: jobEnrichedData.contact.email,
                  title: jobEnrichedData.contact.title,
                },
              });
            }

            // Research Areas
            if (jobEnrichedData.researchAreas.researchAreas.length > 0) {
              // Create job-research area relationships
              const researchAreaRelations =
                jobEnrichedData.researchAreas.researchAreas.map((areaName) => ({
                  jobPostingId: jobPosting.id,
                  researchAreaName: areaName,
                }));

              if (researchAreaRelations.length > 0) {
                // Store for batch processing later
                if (!stats.pendingResearchAreas) {
                  stats.pendingResearchAreas = [];
                }
                stats.pendingResearchAreas.push(...researchAreaRelations);
              }
            }
          }
        }

        return jobPosting;
      } catch (error) {
        const errorMsg = `Error processing job ${jobData.title}: ${error}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
        return null;
      }
    });

    await Promise.all(batchPromises);
  }

  // Batch process research areas to avoid unique constraint violations
  if (stats.pendingResearchAreas.length > 0) {
    console.log(
      `🔬 Batch processing ${stats.pendingResearchAreas.length} research area relationships...`
    );

    try {
      // Get all unique research area names
      const uniqueResearchAreaNames = Array.from(
        new Set(stats.pendingResearchAreas.map((ra) => ra.researchAreaName))
      );

      // Get existing research areas
      const existingResearchAreas = await prisma.researchArea.findMany({
        where: {
          name: { in: uniqueResearchAreaNames },
        },
      });

      const existingMap = new Map(
        existingResearchAreas.map((area) => [area.name, area])
      );

      // Create new research areas for missing ones
      const newResearchAreas = [];
      for (const areaName of uniqueResearchAreaNames) {
        if (!existingMap.has(areaName)) {
          try {
            const newArea = await prisma.researchArea.create({
              data: { name: areaName },
            });
            existingMap.set(areaName, newArea);
            newResearchAreas.push(newArea);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes("Unique constraint failed")
            ) {
              // Research area was created by another concurrent process, fetch it
              const fetchedArea = await prisma.researchArea.findUnique({
                where: { name: areaName },
              });
              if (fetchedArea) {
                existingMap.set(areaName, fetchedArea);
              }
            } else {
              throw error;
            }
          }
        }
      }

      // Create job-research area relationships
      const researchAreaRelations = stats.pendingResearchAreas
        .map((ra) => {
          const area = existingMap.get(ra.researchAreaName);
          return area
            ? {
                jobPostingId: ra.jobPostingId,
                researchAreaId: area.id,
              }
            : null;
        })
        .filter(
          (ra): ra is { jobPostingId: number; researchAreaId: number } =>
            ra !== null
        );

      if (researchAreaRelations.length > 0) {
        await prisma.jobResearchArea.createMany({
          data: researchAreaRelations,
          skipDuplicates: true,
        });
        console.log(
          `✅ Created ${researchAreaRelations.length} research area relationships`
        );
      }
    } catch (error) {
      console.error("❌ Error processing research areas:", error);
      stats.errors.push(`Research area processing failed: ${error}`);
    }
  }

  return stats;
};

export const loadJobs = async (transformedData: {
  institutions: Map<string, Omit<Institution, "id">>;
  departments: Map<string, Omit<Department, "id"> & { institutionKey: string }>;
  disciplines: Map<string, Omit<Discipline, "id">>;
  jobPostings: Array<TransformedJob>;
  keywords: Map<string, Omit<Keyword, "id">>;
  enrichedData: Array<{
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
  } | null>;
}) => {
  console.log("🚀 Starting batch database operations...");
  const startTime = Date.now();

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
    // 1. Batch load institutions
    const institutionMap = await batchUpsertInstitutions(
      transformedData.institutions
    );
    stats.institutions = institutionMap.size;

    // 2. Batch load departments
    const departmentMap = await batchUpsertDepartments(
      transformedData.departments,
      institutionMap
    );
    stats.departments = departmentMap.size;

    // 3. Batch load disciplines
    const disciplineMap = await batchUpsertDisciplines(
      transformedData.disciplines
    );
    stats.disciplines = disciplineMap.size;

    // 4. Batch load keywords
    const keywordMap = await batchUpsertKeywords(transformedData.keywords);
    stats.keywords = keywordMap.size;

    // 5. Batch load job postings and their relationships
    const jobStats = await batchUpsertJobPostings(
      transformedData.jobPostings,
      transformedData.enrichedData,
      departmentMap,
      disciplineMap,
      keywordMap
    );

    stats.jobPostings = transformedData.jobPostings.length;
    stats.jobKeywords = jobStats.jobKeywords;
    stats.jobsCreated = jobStats.jobsCreated;
    stats.jobsUpdated = jobStats.jobsUpdated;
    stats.errors = jobStats.errors;

    const endTime = Date.now();
    console.log(
      `✅ Batch database operations completed in ${endTime - startTime}ms`
    );
    console.log("📊 Statistics:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Error loading data to database:", error);
    throw error;
  }
};
