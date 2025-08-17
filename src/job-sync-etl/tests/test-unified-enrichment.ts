import "dotenv/config";
import { UnifiedEnrichmentService } from "@/job-sync-etl/services/unified-enrichment";
import { LLMServiceFactory } from "@/job-sync-etl/services/llm-service-factory";

const testJobDescription = `
Assistant Professor Position in Computer Science

The Department of Computer Science at Example University invites applications for a tenure-track Assistant Professor position in Computer Science, with a focus on artificial intelligence and machine learning.

Position Details:
- Full-time, tenure-track position
- Start date: Fall 2024
- Salary: Competitive and commensurate with experience
- Location: On-campus with some remote work flexibility

Requirements:
- Ph.D. in Computer Science or related field
- Strong research record in AI/ML
- Teaching experience preferred
- Must be eligible to work in the United States

Application Materials:
- CV/Resume
- Cover letter
- Research statement
- Teaching statement
- Three letters of recommendation
- Graduate transcripts

The position is funded by the university and offers visa sponsorship for qualified international candidates. The interview process will include a research presentation and teaching demonstration.

This is a renewable position with the possibility of tenure after 6 years.
`;

async function testUnifiedEnrichment() {
  try {
    console.log("🧪 Testing Unified Enrichment Service...");

    // Test service factory
    console.log("\n🔧 Testing Service Factory...");
    const serviceFactory = LLMServiceFactory.getInstance();
    const serviceInfo = serviceFactory.getServiceInfo();
    console.log("Available services:", serviceInfo);

    const preferredService = serviceFactory.getPreferredService();
    console.log("Preferred service:", preferredService?.getServiceName());

    // Test unified service directly
    console.log("\n🤖 Testing Unified Enrichment Service directly...");
    const unifiedService = new UnifiedEnrichmentService();

    if (!unifiedService.isAvailable()) {
      console.log(
        "❌ Unified service not available - no OpenAI API key configured"
      );
      return;
    }

    console.log("✅ Unified service is available");
    console.log("Service name:", unifiedService.getServiceName());
    console.log("Supported features:", unifiedService.getSupportedFeatures());

    // Test single job enrichment
    console.log("\n📝 Testing single job enrichment...");
    const testJob = {
      id: 1,
      g: 1,
      name: "Assistant Professor in Computer Science",
      description: testJobDescription,
      qualifications: "Ph.D. in Computer Science or related field",
      univ: "Example University",
      url: "https://example.com/job",
      deadline_raw: "2024-12-31",
      unit_name: "Department of Computer Science",
      disc: "Computer Science",
      close_date_raw: "2024-12-31",
      salary: "Competitive salary",
      stat: 1,
      location: "Example City, CA",
      tag: "assistantprofessor",
      instructions: "Apply online",
      open_date_raw: "2024-01-01",
      legacy_position_id: 1,
      apply: "https://example.com/apply",
    };

    const enrichedData = await unifiedService.enrichJob(testJob);

    console.log("\n✅ Enrichment completed successfully!");
    console.log("Keywords:", enrichedData.keywords);
    console.log(
      "Job Attributes:",
      JSON.stringify(enrichedData.jobAttributes, null, 2)
    );
    console.log(
      "Job Details:",
      JSON.stringify(enrichedData.jobDetails, null, 2)
    );
    console.log(
      "Application Requirements:",
      JSON.stringify(enrichedData.applicationRequirements, null, 2)
    );
    console.log(
      "Language Requirements:",
      JSON.stringify(enrichedData.languageRequirements, null, 2)
    );
    console.log(
      "Suitable Backgrounds:",
      JSON.stringify(enrichedData.suitableBackgrounds, null, 2)
    );
    console.log(
      "Geolocation:",
      JSON.stringify(enrichedData.geoLocation, null, 2)
    );
    console.log("Contact:", JSON.stringify(enrichedData.contact, null, 2));
    console.log(
      "Research Areas:",
      JSON.stringify(enrichedData.researchAreas, null, 2)
    );

    // Test batch enrichment
    console.log("\n📦 Testing batch enrichment...");
    const testJobs = [
      testJob,
      { ...testJob, id: 2, name: "Research Associate in Physics" },
    ];
    const batchResults = await unifiedService.enrichJobs(testJobs);
    console.log(
      `✅ Batch enrichment completed: ${batchResults.length} jobs processed`
    );

    console.log("\n🎉 All tests completed successfully!");
    console.log(
      "💡 Cost optimization: Single LLM call instead of multiple calls per job"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

async function testServiceSwitching() {
  try {
    console.log("\n🔄 Testing Service Switching...");
    const serviceFactory = LLMServiceFactory.getInstance();

    // Test switching to unified service
    const success = serviceFactory.setPreferredService("unified");
    console.log("Switch to unified service:", success ? "✅" : "❌");

    // Test switching to legacy OpenAI service
    const success2 = serviceFactory.setPreferredService("openai");
    console.log("Switch to legacy OpenAI service:", success2 ? "✅" : "❌");

    // Test switching to Cohere service
    const success3 = serviceFactory.setPreferredService("cohere");
    console.log("Switch to Cohere service:", success3 ? "✅" : "❌");

    // Switch back to unified (preferred)
    serviceFactory.setPreferredService("unified");
  } catch (error) {
    console.error("❌ Service switching test failed:", error);
  }
}

// Run tests
async function runAllTests() {
  await testUnifiedEnrichment();
  await testServiceSwitching();
}

runAllTests();
