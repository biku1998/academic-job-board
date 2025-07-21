import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const markExpiredJobs = async (): Promise<number> => {
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

export const markRemovedJobs = async (
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

export const archiveOldJobs = async (): Promise<number> => {
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
