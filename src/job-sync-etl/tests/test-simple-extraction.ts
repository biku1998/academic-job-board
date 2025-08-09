import "dotenv/config";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

const simpleJobDescription = `
Assistant Professor Position in Computer Science

The Department of Computer Science at Example University invites applications for a tenure-track Assistant Professor position.

Requirements:
- Ph.D. in Computer Science
- Strong research record
- Teaching experience preferred

Salary: Competitive
`;

async function testSimpleExtraction() {
  console.log("🧪 Testing Simple Ollama Extraction...");

  try {
    const enrichmentService = new JobEnrichmentService();

    if (!enrichmentService.isAvailable()) {
      console.log("❌ Service not available");
      return;
    }

    const isHealthy = await enrichmentService.isHealthy();
    console.log(
      `🏥 Health Status: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`
    );

    if (!isHealthy) {
      console.error("❌ Service unhealthy");
      return;
    }

    console.log("\n🔍 Testing keyword extraction (simple)...");
    const keywords = await enrichmentService.extractKeywords(
      "Assistant Professor in Computer Science",
      simpleJobDescription,
      "Ph.D. in Computer Science"
    );

    console.log("✅ Keywords Result:", JSON.stringify(keywords, null, 2));

    console.log("\n🔍 Testing job attributes (simple)...");
    const attributes = await enrichmentService.extractJobAttributes(
      "Assistant Professor in Computer Science",
      simpleJobDescription,
      "Competitive"
    );

    console.log(
      "✅ Job Attributes Result:",
      JSON.stringify(attributes, null, 2)
    );

    console.log("\n🎉 Simple extraction test completed!");
  } catch (error) {
    console.error("❌ Simple extraction test failed:", error);
  }
}

testSimpleExtraction().catch(console.error);
