import prisma from "@/lib/prisma";

async function checkPhase2Data() {
  console.log("🔍 Checking Phase 2 data in database...\n");

  try {
    // Get recent job postings with their Phase 2 relationships
    const jobs = await prisma.jobPosting.findMany({
      select: {
        id: true,
        title: true,
        applicationRequirements: {
          select: {
            documentType: true,
            referenceLettersRequired: true,
            platform: true,
            description: true,
          },
        },
        languageRequirements: {
          select: {
            language: true,
          },
        },
        suitableBackgrounds: {
          select: {
            background: true,
          },
        },
        lastSyncedAt: true,
      },
      orderBy: {
        lastSyncedAt: "desc",
      },
      take: 10,
    });

    console.log(
      `📊 Found ${jobs.length} recent job postings with Phase 2 data:\n`
    );

    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);

      // Application Requirements
      if (job.applicationRequirements.length > 0) {
        console.log(`   📄 Application Requirements:`);
        job.applicationRequirements.forEach((req) => {
          console.log(`      - Documents: ${req.documentType || "N/A"}`);
          console.log(
            `      - Reference Letters: ${
              req.referenceLettersRequired || "N/A"
            }`
          );
          console.log(`      - Platform: ${req.platform || "N/A"}`);
          console.log(`      - Description: ${req.description || "N/A"}`);
        });
      } else {
        console.log(`   📄 Application Requirements: None`);
      }

      // Language Requirements
      if (job.languageRequirements.length > 0) {
        console.log(
          `   🌍 Language Requirements: ${job.languageRequirements
            .map((l) => l.language)
            .join(", ")}`
        );
      } else {
        console.log(`   🌍 Language Requirements: None`);
      }

      // Suitable Backgrounds
      if (job.suitableBackgrounds.length > 0) {
        console.log(
          `   🎓 Suitable Backgrounds: ${job.suitableBackgrounds
            .map((b) => b.background)
            .join(", ")}`
        );
      } else {
        console.log(`   🎓 Suitable Backgrounds: None`);
      }

      console.log(`   📅 Last Synced: ${job.lastSyncedAt}`);
      console.log("");
    });

    // Count statistics
    const stats = await prisma.$transaction([
      prisma.applicationRequirement.count(),
      prisma.languageRequirement.count(),
      prisma.suitableBackground.count(),
      prisma.jobPosting.count(),
    ]);

    console.log("📈 Phase 2 Data Statistics:");
    console.log(`   - Total Job Postings: ${stats[3]}`);
    console.log(`   - Application Requirements: ${stats[0]}`);
    console.log(`   - Language Requirements: ${stats[1]}`);
    console.log(`   - Suitable Backgrounds: ${stats[2]}`);
  } catch (error) {
    console.error("❌ Error checking Phase 2 data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhase2Data().catch(console.error);
