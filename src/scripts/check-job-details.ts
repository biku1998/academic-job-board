import prisma from "@/lib/prisma";

// Using the actual Prisma result type

async function checkJobDetails() {
  console.log("🔍 Checking job details in database...\n");

  try {
    // Get a few recent job postings with the new fields
    const jobs = await prisma.jobPosting.findMany({
      select: {
        id: true,
        title: true,
        isSelfFinanced: true,
        isPartTime: true,
        workHoursPerWeek: true,
        compensationType: true,
        salaryRange: true,
        category: true,
        workModality: true,
        contractType: true,
        fundingSource: true,
        visaSponsorship: true,
        interviewProcess: true,
        lastSyncedAt: true,
      },
      orderBy: {
        lastSyncedAt: "desc",
      },
      take: 10,
    });

    console.log(`📊 Found ${jobs.length} recent job postings:\n`);

    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   - isSelfFinanced: ${job.isSelfFinanced}`);
      console.log(`   - isPartTime: ${job.isPartTime}`);
      console.log(`   - workHoursPerWeek: ${job.workHoursPerWeek}`);
      console.log(`   - compensationType: ${job.compensationType}`);
      console.log(`   - salaryRange: ${job.salaryRange}`);
      console.log(`   - category: ${job.category}`);
      console.log(`   - workModality: ${job.workModality}`);
      console.log(`   - contractType: ${job.contractType}`);
      console.log(`   - fundingSource: ${job.fundingSource}`);
      console.log(`   - visaSponsorship: ${job.visaSponsorship}`);
      console.log(`   - interviewProcess: ${job.interviewProcess}`);
      console.log(`   - Last Synced: ${job.lastSyncedAt}`);
      console.log("");
    });

    // Count how many jobs have the new fields populated
    const stats = await prisma.jobPosting.groupBy({
      by: [
        "isSelfFinanced",
        "isPartTime",
        "workHoursPerWeek",
        "compensationType",
      ],
      _count: {
        id: true,
      },
    });

    console.log("📈 Field Population Statistics:");
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("❌ Error checking job details:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkJobDetails().catch(console.error);
