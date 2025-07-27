import prisma from "@/lib/prisma";

async function checkPhase3Data() {
  console.log("🔍 Checking Phase 3 data in database...\n");

  try {
    // Get recent job postings with their Phase 3 relationships
    const jobs = await prisma.jobPosting.findMany({
      select: {
        id: true,
        title: true,
        geoLocation: {
          select: {
            lat: true,
            lon: true,
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            title: true,
          },
        },
        jobResearchAreas: {
          select: {
            researchArea: {
              select: {
                name: true,
              },
            },
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
      `📊 Found ${jobs.length} recent job postings with Phase 3 data:\n`
    );

    jobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);

      // GeoLocation
      if (job.geoLocation) {
        console.log(
          `   📍 GeoLocation: ${job.geoLocation.lat}, ${job.geoLocation.lon}`
        );
      } else {
        console.log(`   📍 GeoLocation: None`);
      }

      // Contact
      if (job.contact) {
        console.log(`   📞 Contact:`);
        console.log(`      - Name: ${job.contact.name || "N/A"}`);
        console.log(`      - Email: ${job.contact.email || "N/A"}`);
        console.log(`      - Title: ${job.contact.title || "N/A"}`);
      } else {
        console.log(`   📞 Contact: None`);
      }

      // Research Areas
      if (job.jobResearchAreas.length > 0) {
        const researchAreas = job.jobResearchAreas.map(
          (ra) => ra.researchArea.name
        );
        console.log(`   🔬 Research Areas: ${researchAreas.join(", ")}`);
      } else {
        console.log(`   🔬 Research Areas: None`);
      }

      console.log(`   📅 Last Synced: ${job.lastSyncedAt}`);
      console.log("");
    });

    // Count statistics
    const stats = await prisma.$transaction([
      prisma.geoLocation.count(),
      prisma.contact.count(),
      prisma.researchArea.count(),
      prisma.jobResearchArea.count(),
      prisma.jobPosting.count(),
    ]);

    console.log("📈 Phase 3 Data Statistics:");
    console.log(`   - Total Job Postings: ${stats[4]}`);
    console.log(`   - GeoLocations: ${stats[0]}`);
    console.log(`   - Contacts: ${stats[1]}`);
    console.log(`   - Research Areas: ${stats[2]}`);
    console.log(`   - Job-Research Area Relationships: ${stats[3]}`);

    // Show some research areas
    const researchAreas = await prisma.researchArea.findMany({
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    console.log("\n🔬 Sample Research Areas:");
    researchAreas.forEach((area, index) => {
      console.log(`   ${index + 1}. ${area.name}`);
    });
  } catch (error) {
    console.error("❌ Error checking Phase 3 data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhase3Data().catch(console.error);
