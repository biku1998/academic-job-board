import "dotenv/config";
import { JobEnrichmentService } from "../services/job-enrichment";

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

async function testEnrichment() {
  try {
    console.log("🧪 Testing Job Enrichment Service with Cohere...");

    const enrichmentService = new JobEnrichmentService();

    if (!enrichmentService.isAvailable()) {
      console.log("❌ Service not available - no API key configured");
      return;
    }

    console.log("\n🔍 Testing keyword extraction...");
    const keywords = await enrichmentService.extractKeywords(
      "Assistant Professor in Computer Science",
      testJobDescription,
      "Ph.D. in Computer Science or related field with strong research record in AI/ML"
    );

    console.log("✅ Keywords:", JSON.stringify(keywords, null, 2));

    console.log("\n📝 Testing job attributes extraction...");
    const attributes = await enrichmentService.extractJobAttributes(
      "Assistant Professor in Computer Science",
      testJobDescription,
      "Competitive salary"
    );

    console.log("✅ Job Attributes:", JSON.stringify(attributes, null, 2));

    console.log("\n📝 Testing application requirements extraction...");
    const requirements = await enrichmentService.extractApplicationRequirements(
      testJobDescription
    );

    console.log(
      "✅ Application Requirements:",
      JSON.stringify(requirements, null, 2)
    );

    console.log("\n📝 Testing language requirements extraction...");
    const languages = await enrichmentService.extractLanguageRequirements(
      testJobDescription
    );

    console.log(
      "✅ Language Requirements:",
      JSON.stringify(languages, null, 2)
    );

    console.log("\n📝 Testing suitable backgrounds extraction...");
    const backgrounds = await enrichmentService.extractSuitableBackgrounds(
      testJobDescription
    );

    console.log(
      "✅ Suitable Backgrounds:",
      JSON.stringify(backgrounds, null, 2)
    );

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testEnrichment();
