import { PrismaClient } from "@/generated/prisma";
import type {
  Institution,
  Department,
  Discipline,
  Keyword,
} from "@/generated/prisma";
import type { TransformedJob } from "./types";

const prisma = new PrismaClient();

export const loadJobs = async (transformedData: {
  institutions: Map<string, Omit<Institution, "id">>;
  departments: Map<string, Omit<Department, "id"> & { institutionKey: string }>;
  disciplines: Map<string, Omit<Discipline, "id">>;
  jobPostings: Array<TransformedJob>;
  keywords: Map<string, Omit<Keyword, "id">>;
}) => {
  console.log("Starting to load data to database...");

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
        let institution = await prisma.institution.findFirst({
          where: { name: institutionData.name },
        });
        if (institution) {
          institution = await prisma.institution.update({
            where: { id: institution.id },
            data: {
              location: institutionData.location,
              website: institutionData.website,
              type: institutionData.type,
              description: institutionData.description,
            },
          });
        } else {
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
        let department = await prisma.department.findFirst({
          where: {
            name: departmentData.name,
            institutionId: institutionId,
          },
        });
        if (department) {
          department = await prisma.department.update({
            where: { id: department.id },
            data: {
              location: departmentData.location,
              contactInfo: departmentData.contactInfo,
              description: departmentData.description,
              website: departmentData.website,
            },
          });
        } else {
          department = await prisma.department.create({
            data: {
              name: departmentData.name,
              location: departmentData.location,
              contactInfo: departmentData.contactInfo,
              institutionId: institutionId,
              description: departmentData.description,
              website: departmentData.website,
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
        let discipline = await prisma.discipline.findFirst({
          where: { name: disciplineData.name },
        });
        if (discipline) {
          discipline = await prisma.discipline.update({
            where: { id: discipline.id },
            data: {
              parentId: disciplineData.parentId,
            },
          });
        } else {
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
        let keyword = await prisma.keyword.findUnique({
          where: { name: keywordData.name },
        });
        if (!keyword) {
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
        const expiresAt = jobData.closeDate || jobData.deadlineDate || null;
        const existingJob = await prisma.jobPosting.findFirst({
          where: {
            sourceUrl: jobData.sourceUrl,
          },
        });
        if (existingJob) {
          console.log(`Updating existing job: ${jobData.title}`);
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
          for (const keywordName of jobData.keywords) {
            try {
              const keywordId = keywordMap.get(keywordName);
              if (keywordId) {
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
