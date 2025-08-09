import "dotenv/config";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";
import { config, ollamaModels } from "@/config";

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

async function testOllamaIntegration() {
  console.log("🧪 Testing Complete Ollama Integration...");
  console.log(`🔗 Ollama URL: ${config.ollamaUrl}`);
  console.log(`📋 Expected models: ${ollamaModels.join(", ")}`);

  try {
    console.log("\n🔍 Step 1: Initialize JobEnrichmentService...");
    const enrichmentService = new JobEnrichmentService();

    if (!enrichmentService.isAvailable()) {
      console.log("❌ Service not available - no LLM service configured");
      return;
    }

    console.log("✅ JobEnrichmentService initialized successfully");

    console.log("\n🔍 Step 2: Testing service health...");
    const isHealthy = await enrichmentService.isHealthy();
    console.log(
      `🏥 Health Status: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`
    );

    if (!isHealthy) {
      console.error("❌ Service is not healthy - cannot proceed with tests");
      return;
    }

    console.log("\n🔍 Step 3: Testing keyword extraction...");
    const keywords = await enrichmentService.extractKeywords(
      "Assistant Professor in Computer Science",
      testJobDescription,
      "Ph.D. in Computer Science or related field with strong research record in AI/ML"
    );

    console.log("✅ Keywords Result:", JSON.stringify(keywords, null, 2));

    console.log("\n🔍 Step 4: Testing job attributes extraction...");
    const attributes = await enrichmentService.extractJobAttributes(
      "Assistant Professor in Computer Science",
      testJobDescription,
      "Competitive salary"
    );

    console.log(
      "✅ Job Attributes Result:",
      JSON.stringify(attributes, null, 2)
    );

    console.log("\n🔍 Step 5: Testing application requirements extraction...");
    const requirements = await enrichmentService.extractApplicationRequirements(
      testJobDescription
    );

    console.log(
      "✅ Application Requirements Result:",
      JSON.stringify(requirements, null, 2)
    );

    console.log("\n🔍 Step 6: Testing language requirements extraction...");
    const languages = await enrichmentService.extractLanguageRequirements(
      testJobDescription
    );

    console.log(
      "✅ Language Requirements Result:",
      JSON.stringify(languages, null, 2)
    );

    console.log("\n🔍 Step 7: Testing suitable backgrounds extraction...");
    const backgrounds = await enrichmentService.extractSuitableBackgrounds(
      testJobDescription
    );

    console.log(
      "✅ Suitable Backgrounds Result:",
      JSON.stringify(backgrounds, null, 2)
    );

    console.log("\n🔍 Step 8: Testing geolocation extraction...");
    const geoLocation = await enrichmentService.extractGeoLocation(
      "Assistant Professor in Computer Science",
      testJobDescription,
      "University Campus, California"
    );

    console.log("✅ GeoLocation Result:", JSON.stringify(geoLocation, null, 2));

    console.log("\n🔍 Step 9: Testing contact extraction...");
    const contact = await enrichmentService.extractContact(
      testJobDescription,
      "Please send applications to hr@example.edu"
    );

    console.log("✅ Contact Result:", JSON.stringify(contact, null, 2));

    console.log("\n🔍 Step 10: Testing research areas extraction...");
    const researchAreas = await enrichmentService.extractResearchAreas(
      "Assistant Professor in Computer Science",
      testJobDescription
    );

    console.log(
      "✅ Research Areas Result:",
      JSON.stringify(researchAreas, null, 2)
    );

    console.log("\n🎉 All Ollama integration tests completed successfully!");
    console.log("✅ Ready for production use");

    // Summary of results
    console.log("\n📊 Test Summary:");
    const results = [
      keywords,
      attributes,
      requirements,
      languages,
      backgrounds,
      geoLocation,
      contact,
      researchAreas,
    ];
    const successfulExtractions = results.filter(
      (r) => r.confidence > 0.3
    ).length;
    console.log(
      `📈 Successful extractions: ${successfulExtractions}/${results.length}`
    );
    console.log(
      `📊 Average confidence: ${(
        results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      ).toFixed(2)}`
    );
  } catch (error) {
    console.error("❌ Integration test failed:", error);
    console.error("\n🛠️  Troubleshooting:");
    console.error("1. Ensure OLLAMA_URL is correctly set in .env");
    console.error("2. Verify remote Ollama service is running");
    console.error(
      "3. Check that required models are installed on remote instance"
    );
    console.error(
      "4. Test basic connection with: npx tsx src/job-sync-etl/tests/test-ollama-connection.ts"
    );
  }
}

// Run the integration test
testOllamaIntegration().catch(console.error);
