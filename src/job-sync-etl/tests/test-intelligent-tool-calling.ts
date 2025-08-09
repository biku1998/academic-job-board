import "dotenv/config";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";
import { config } from "@/config";

// Test job with minimal information to trigger web search
const minimalJobDescription = `
Assistant Professor Position

The Department invites applications for a faculty position.

Requirements:
- Ph.D. required
- Research experience

Contact: hr@university.edu
`;

// Test job with missing geolocation info to trigger search
const locationJobDescription = `
Postdoctoral Research Fellow

The Institute for Advanced Studies at University of Edinburgh invites applications for a postdoctoral position in quantum physics.

Requirements:
- Ph.D. in Physics
- Experience with quantum systems
- Strong publication record

This is a 2-year fixed-term position with possibility of extension.
Salary: £35,000 - £40,000 per annum.
`;

async function testIntelligentToolCalling() {
  console.log("🧪 Testing Intelligent Tool Calling with Ollama...");
  console.log(`🔗 Ollama URL: ${config.ollamaUrl}`);
  console.log(
    `🔍 Tavily API: ${config.tavilyApiKey ? "Available" : "Not available"}`
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

    // Test 1: Minimal job description - should trigger web search for more details
    console.log(
      "\n🔍 Test 1: Minimal job description (should trigger tool calling)..."
    );
    console.log(
      "📝 Testing with minimal job info to see if LLM requests web search"
    );

    const jobAttributes = await enrichmentService.extractJobAttributes(
      "Assistant Professor Position",
      minimalJobDescription,
      "Competitive"
    );

    console.log(
      "✅ Job Attributes Result:",
      JSON.stringify(jobAttributes, null, 2)
    );
    console.log(`📊 Confidence: ${jobAttributes.confidence}`);

    // Test 2: Geolocation extraction - should trigger web search for coordinates
    console.log(
      "\n🔍 Test 2: Geolocation extraction (should trigger web search)..."
    );
    console.log(
      "📍 Testing geolocation extraction for University of Edinburgh"
    );

    const geoLocation = await enrichmentService.extractGeoLocation(
      "Postdoctoral Research Fellow",
      locationJobDescription,
      "University of Edinburgh, Scotland"
    );

    console.log("✅ GeoLocation Result:", JSON.stringify(geoLocation, null, 2));
    console.log(`📊 Confidence: ${geoLocation.confidence}`);

    if (geoLocation.lat && geoLocation.lon) {
      console.log(
        `📍 Coordinates found: ${geoLocation.lat}, ${geoLocation.lon}`
      );
    } else {
      console.log("📍 No coordinates extracted");
    }

    // Test 3: Research areas - might trigger web search for specific details
    console.log("\n🔍 Test 3: Research areas extraction...");

    const researchAreas = await enrichmentService.extractResearchAreas(
      "Postdoctoral Research Fellow",
      locationJobDescription
    );

    console.log(
      "✅ Research Areas Result:",
      JSON.stringify(researchAreas, null, 2)
    );
    console.log(`📊 Confidence: ${researchAreas.confidence}`);

    console.log("\n📊 Tool Calling Test Summary:");
    console.log(`🎯 Job Attributes - Confidence: ${jobAttributes.confidence}`);
    console.log(`🌍 GeoLocation - Confidence: ${geoLocation.confidence}`);
    console.log(`🔬 Research Areas - Confidence: ${researchAreas.confidence}`);

    if (config.tavilyApiKey) {
      console.log("\n✅ Intelligent tool calling test completed!");
      console.log(
        "🔍 Check the logs above to see if the LLM made any web search requests"
      );
    } else {
      console.log(
        "\n⚠️  Tool calling test completed, but Tavily API key not available"
      );
      console.log(
        "🔍 Tool calling will be simulated but web searches won't execute"
      );
    }
  } catch (error) {
    console.error("❌ Intelligent tool calling test failed:", error);
    console.error("\n🛠️  This might indicate:");
    console.error("1. Issues with the tool calling implementation");
    console.error("2. Ollama service connectivity problems");
    console.error("3. Model not understanding tool instructions");
  }
}

testIntelligentToolCalling().catch(console.error);
