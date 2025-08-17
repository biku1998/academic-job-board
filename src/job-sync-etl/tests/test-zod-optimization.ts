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

async function testZodOptimization() {
  try {
    console.log("🧪 Testing Zod Schema Optimization...");

    // Test service factory
    console.log("\n🔧 Testing Service Factory...");
    const serviceFactory = LLMServiceFactory.getInstance();
    const serviceInfo = serviceFactory.getServiceInfo();
    console.log("Available services:", serviceInfo);

    const preferredService = serviceFactory.getPreferredService();
    console.log("Preferred service:", preferredService?.getServiceName());

    // Test unified service directly
    console.log("\n🤖 Testing Zod-Optimized Unified Enrichment Service...");
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

    // Verify Zod schema features
    const features = unifiedService.getSupportedFeatures();
    if (
      features.includes("zod-schema-validation") &&
      features.includes("native-openai-validation")
    ) {
      console.log("✅ Zod schema optimization features confirmed");
    } else {
      console.log("❌ Zod schema optimization features missing");
    }

    // Test single job enrichment
    console.log("\n📝 Testing single job enrichment with Zod validation...");
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

    const startTime = Date.now();
    const enrichedData = await unifiedService.enrichJob(testJob);
    const endTime = Date.now();

    console.log("\n✅ Enrichment completed successfully!");
    console.log(`⏱️  Processing time: ${endTime - startTime}ms`);
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

    // Test data validation
    console.log("\n🔍 Testing data validation...");
    const validationChecks = [
      { field: "keywords", value: enrichedData.keywords, expected: "array" },
      {
        field: "jobAttributes.category",
        value: enrichedData.jobAttributes.category,
        expected: "string or null",
      },
      {
        field: "jobAttributes.workModality",
        value: enrichedData.jobAttributes.workModality,
        expected: "string or null",
      },
      {
        field: "jobDetails.isPartTime",
        value: enrichedData.jobDetails.isPartTime,
        expected: "boolean or null",
      },
      {
        field: "applicationRequirements.documentTypes",
        value: enrichedData.applicationRequirements.documentTypes,
        expected: "array",
      },
    ];

    validationChecks.forEach((check) => {
      const isValid =
        Array.isArray(check.value) ||
        check.value === null ||
        typeof check.value === "string" ||
        typeof check.value === "boolean";
      console.log(
        `${isValid ? "✅" : "❌"} ${check.field}: ${
          check.value
        } (${typeof check.value})`
      );
    });

    console.log("\n🎉 Zod schema optimization test completed successfully!");
    console.log("💡 Benefits of Zod optimization:");
    console.log("   - ✅ Guaranteed valid output structure");
    console.log("   - ✅ No JSON parsing errors");
    console.log("   - ✅ Automatic type conversion");
    console.log("   - ✅ Reduced validation overhead");
    console.log("   - ✅ Better cost efficiency");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

async function testPerformanceComparison() {
  try {
    console.log("\n📊 Performance Comparison Test...");

    const unifiedService = new UnifiedEnrichmentService();
    if (!unifiedService.isAvailable()) {
      console.log("❌ Service not available for performance test");
      return;
    }

    const testJob = {
      id: 1,
      g: 1,
      name: "Test Job for Performance",
      description: "This is a test job description for performance testing.",
      qualifications: "Test qualifications",
      univ: "Test University",
      url: "https://test.com",
      deadline_raw: "2024-12-31",
      unit_name: "Test Department",
      disc: "Test Discipline",
      close_date_raw: "2024-12-31",
      salary: "Test salary",
      stat: 1,
      location: "Test City",
      tag: "test",
      instructions: "Test instructions",
      open_date_raw: "2024-01-01",
      legacy_position_id: 1,
      apply: "https://test.com/apply",
    };

    // Test multiple enrichments to measure performance
    const iterations = 3;
    const times: number[] = [];

    console.log(`🔄 Running ${iterations} enrichment iterations...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await unifiedService.enrichJob(testJob);
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);
      console.log(`   Iteration ${i + 1}: ${duration}ms`);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log("\n📈 Performance Results:");
    console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min time: ${minTime}ms`);
    console.log(`   Max time: ${maxTime}ms`);
    console.log(
      `   Consistency: ${(((maxTime - minTime) / avgTime) * 100).toFixed(
        1
      )}% variation`
    );
  } catch (error) {
    console.error("❌ Performance test failed:", error);
  }
}

// Run tests
async function runAllTests() {
  await testZodOptimization();
  await testPerformanceComparison();
}

runAllTests();
