import "dotenv/config";
import { LLMServiceFactory } from "../services/llm-service-factory";
import { JobEnrichmentService } from "../services/job-enrichment";
import type { JobPosting } from "../types";

async function testOpenAIMigration() {
  console.log("🧪 Testing OpenAI Migration...");

  // Test 1: Service Factory
  console.log("\n1. Testing Service Factory...");
  const factory = LLMServiceFactory.getInstance();
  const serviceInfo = factory.getServiceInfo();
  console.log("Available services:", serviceInfo);

  const preferredService = factory.getPreferredService();
  if (preferredService) {
    console.log(`✅ Preferred service: ${preferredService.getServiceName()}`);
    console.log(
      `Features: ${preferredService.getSupportedFeatures().join(", ")}`
    );
  } else {
    console.log("❌ No preferred service available");
  }

  // Test 2: Job Enrichment Service
  console.log("\n2. Testing Job Enrichment Service...");
  const jobEnrichment = new JobEnrichmentService();
  console.log(`Service available: ${jobEnrichment.isAvailable()}`);

  if (jobEnrichment.isAvailable()) {
    const serviceInfo = jobEnrichment.getServiceInfo();
    console.log("Service info:", serviceInfo);

    // Test 3: Mock Job Enrichment
    console.log("\n3. Testing Job Enrichment...");
    const mockJob: JobPosting = {
      id: 1,
      g: 1,
      name: "Assistant Professor in Computer Science",
      univ: "MIT",
      url: "https://example.com/job1",
      description:
        "We are seeking an Assistant Professor in Computer Science with expertise in machine learning and artificial intelligence. The successful candidate will conduct research, teach courses, and contribute to the department's mission.",
      deadline_raw: "2024-12-31",
      unit_name: "Department of Computer Science",
      disc: "Computer Science",
      close_date_raw: "2024-12-31",
      salary: "$120,000 - $150,000",
      stat: 1,
      location: "Cambridge, MA",
      tag: "faculty",
      instructions:
        "Please submit CV, cover letter, research statement, and three reference letters.",
      open_date_raw: "2024-01-01",
      legacy_position_id: 1,
      qualifications:
        "PhD in Computer Science or related field, strong research record in ML/AI, teaching experience preferred.",
      apply: "https://example.com/apply1",
    };

    try {
      console.log("Enriching mock job...");
      const enrichedData = await jobEnrichment.enrichJob(mockJob);
      console.log("✅ Job enrichment successful!");
      console.log("Keywords:", enrichedData.keywords);
      console.log("Job attributes:", enrichedData.jobAttributes);
      console.log("Job details:", enrichedData.jobDetails);
      console.log(
        "Application requirements:",
        enrichedData.applicationRequirements
      );
      console.log("Language requirements:", enrichedData.languageRequirements);
      console.log("Suitable backgrounds:", enrichedData.suitableBackgrounds);
      console.log("Geolocation:", enrichedData.geoLocation);
      console.log("Contact:", enrichedData.contact);
      console.log("Research areas:", enrichedData.researchAreas);
    } catch (error) {
      console.error("❌ Job enrichment failed:", error);
    }
  }

  console.log("\n🎯 Migration test completed!");
}

// Run the test if this file is executed directly
if (require.main === module) {
  testOpenAIMigration().catch(console.error);
}

export { testOpenAIMigration };
