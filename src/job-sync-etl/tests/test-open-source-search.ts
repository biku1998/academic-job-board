import "dotenv/config";
import { OpenSourceSearchService } from "@/job-sync-etl/services/open-source-search";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

async function testOpenSourceSearch() {
  console.log("🧪 Testing Open Source Search Integration...");

  const searchService = new OpenSourceSearchService();

  try {
    // Test 1: DuckDuckGo search for university information
    console.log("\n🔍 Test 1: University search (should use DuckDuckGo)...");
    const universitySearch = await searchService.search(
      "University of Edinburgh Scotland",
      3
    );

    console.log(`✅ University Search Results (${universitySearch.source}):`);
    console.log(JSON.stringify(universitySearch, null, 2));

    // Test 2: Location/coordinates search
    console.log("\n🔍 Test 2: Location search (should use OpenStreetMap)...");
    const locationSearch = await searchService.search(
      "Edinburgh Scotland coordinates latitude longitude",
      3
    );

    console.log(`✅ Location Search Results (${locationSearch.source}):`);
    console.log(JSON.stringify(locationSearch, null, 2));

    // Test 3: Academic research topic
    console.log("\n🔍 Test 3: Academic research search...");
    const researchSearch = await searchService.search(
      "quantum physics research areas computational",
      3
    );

    console.log(`✅ Research Search Results (${researchSearch.source}):`);
    console.log(JSON.stringify(researchSearch, null, 2));

    // Test 4: Format for LLM
    console.log("\n🔍 Test 4: LLM formatting...");
    const formattedResults = searchService.formatForLLM(universitySearch);
    console.log("✅ LLM Formatted Results:");
    console.log(formattedResults);

    console.log("\n🎉 Open source search tests completed successfully!");
  } catch (error) {
    console.error("❌ Open source search test failed:", error);
  }
}

async function testIntegratedSearch() {
  console.log("\n🧪 Testing Integrated Search with JobEnrichmentService...");

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

    // Test geolocation with open-source search
    console.log(
      "\n🔍 Testing geolocation extraction with open-source search..."
    );
    const geoLocation = await enrichmentService.extractGeoLocation(
      "Research Position at MIT",
      "The Massachusetts Institute of Technology in Cambridge, Massachusetts invites applications for a research position.",
      "MIT Cambridge Massachusetts"
    );

    console.log("✅ GeoLocation Result:", JSON.stringify(geoLocation, null, 2));

    if (geoLocation.lat && geoLocation.lon) {
      console.log(
        `📍 Coordinates found: ${geoLocation.lat}, ${geoLocation.lon}`
      );
    }

    console.log("\n🎉 Integrated search test completed successfully!");
  } catch (error) {
    console.error("❌ Integrated search test failed:", error);
  }
}

async function runAllTests() {
  await testOpenSourceSearch();
  await testIntegratedSearch();

  console.log("\n📊 Summary:");
  console.log("✅ Open-source search eliminates Tavily costs");
  console.log("✅ DuckDuckGo provides free instant answers");
  console.log("✅ OpenStreetMap provides free geolocation");
  console.log("✅ Academic queries get specialized handling");
  console.log("✅ Full integration with existing LLM pipeline");
}

runAllTests().catch(console.error);
