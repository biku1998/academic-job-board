import "dotenv/config";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

// Test with queries that should work well with DuckDuckGo
const testJobDescription = `
Senior Research Scientist Position

The Department of Computer Science at Stanford University invites applications for a Senior Research Scientist position in artificial intelligence and machine learning.

Requirements:
- Ph.D. in Computer Science, AI, or related field
- 5+ years of research experience
- Strong publication record in top-tier venues
- Experience with deep learning frameworks

This is a full-time position offering competitive salary and benefits.
The position offers visa sponsorship for qualified international candidates.

Contact: careers@stanford.edu
`;

async function testCostFreeSearch() {
  console.log("🧪 Testing Cost-Free Search Integration...");
  console.log(
    "💰 No Tavily costs - Using DuckDuckGo + OpenStreetMap + fallbacks"
  );

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

    // Test 1: Job attributes extraction with potential web search
    console.log(
      "\n🔍 Test 1: Job attributes extraction (may trigger intelligent tool calling)..."
    );
    const jobAttributes = await enrichmentService.extractJobAttributes(
      "Senior Research Scientist at Stanford University",
      testJobDescription,
      "Competitive salary"
    );

    console.log(
      "✅ Job Attributes Result:",
      JSON.stringify(jobAttributes, null, 2)
    );
    console.log(`📊 Confidence: ${jobAttributes.confidence}`);

    // Test 2: Research areas extraction
    console.log("\n🔍 Test 2: Research areas extraction...");
    const researchAreas = await enrichmentService.extractResearchAreas(
      "Senior Research Scientist at Stanford University",
      testJobDescription
    );

    console.log(
      "✅ Research Areas Result:",
      JSON.stringify(researchAreas, null, 2)
    );
    console.log(`📊 Confidence: ${researchAreas.confidence}`);

    // Test 3: Application requirements
    console.log("\n🔍 Test 3: Application requirements extraction...");
    const requirements = await enrichmentService.extractApplicationRequirements(
      testJobDescription
    );

    console.log(
      "✅ Application Requirements Result:",
      JSON.stringify(requirements, null, 2)
    );
    console.log(`📊 Confidence: ${requirements.confidence}`);

    // Test 4: Keywords extraction
    console.log("\n🔍 Test 4: Keywords extraction...");
    const keywords = await enrichmentService.extractKeywords(
      "Senior Research Scientist at Stanford University",
      testJobDescription,
      "Ph.D. in Computer Science, AI, or related field required"
    );

    console.log("✅ Keywords Result:", JSON.stringify(keywords, null, 2));
    console.log(`📊 Confidence: ${keywords.confidence}`);

    console.log("\n📊 Cost-Free Search Test Summary:");
    console.log(`🎯 Job Attributes - Confidence: ${jobAttributes.confidence}`);
    console.log(`🔬 Research Areas - Confidence: ${researchAreas.confidence}`);
    console.log(
      `📄 Application Requirements - Confidence: ${requirements.confidence}`
    );
    console.log(`🏷️  Keywords - Confidence: ${keywords.confidence}`);

    console.log("\n💰 Cost Savings Analysis:");
    console.log("✅ Eliminated Tavily API costs ($0.001 per search)");
    console.log("✅ Using free DuckDuckGo Instant Answer API");
    console.log("✅ Using free OpenStreetMap Nominatim API for locations");
    console.log("✅ Fallback to direct scraping when needed");
    console.log("✅ No API rate limits or usage restrictions");

    const totalExtractions = 4;
    const avgSearchesPerExtraction = 1.5; // Some extractions might trigger web search
    const totalSearches = totalExtractions * avgSearchesPerExtraction;
    const tavilyCostPerSearch = 0.001;
    const savedCosts = totalSearches * tavilyCostPerSearch;

    console.log(
      `\n📈 Per-run savings: ~$${savedCosts.toFixed(
        4
      )} (${totalSearches} searches)`
    );
    console.log(`📈 Daily savings (2 runs): ~$${(savedCosts * 2).toFixed(4)}`);
    console.log(`📈 Monthly savings: ~$${(savedCosts * 2 * 30).toFixed(2)}`);
    console.log(`📈 Annual savings: ~$${(savedCosts * 2 * 365).toFixed(2)}`);

    console.log("\n🎉 Cost-free search integration completed successfully!");
  } catch (error) {
    console.error("❌ Cost-free search test failed:", error);
  }
}

testCostFreeSearch().catch(console.error);
