import "dotenv/config";
import { JobEnrichmentService } from "@/job-sync-etl/services/job-enrichment";

async function testJobDetailsExtraction() {
  console.log("🧪 Testing Job Details Extraction (Phase 1)...\n");

  const enrichmentService = new JobEnrichmentService();

  if (!enrichmentService.isAvailable()) {
    console.log("❌ JobEnrichmentService is not available (no API key)");
    return;
  }

  // Test case 1: Self-financed position
  console.log("📋 Test Case 1: Self-financed position");
  const testJob1 = {
    title: "Postdoctoral Research Fellow in Machine Learning",
    description:
      "We are seeking a highly motivated postdoctoral researcher to join our machine learning team. The successful candidate will be responsible for securing their own funding through external grants and fellowships. This position requires 40 hours per week commitment.",
    salary: "Competitive stipend based on experience",
    instructions:
      "Please submit your CV, research statement, and funding proposal. The candidate must demonstrate ability to secure external funding.",
    qualifications:
      "PhD in Computer Science or related field. Experience with machine learning frameworks required.",
  };

  try {
    const result1 = await enrichmentService.extractJobDetails(
      testJob1.title,
      testJob1.description,
      testJob1.salary,
      testJob1.instructions,
      testJob1.qualifications
    );

    console.log("Result:", JSON.stringify(result1, null, 2));
    console.log("✅ Test 1 completed\n");
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }

  // Test case 2: Part-time position
  console.log("📋 Test Case 2: Part-time position");
  const testJob2 = {
    title: "Adjunct Professor in Mathematics",
    description:
      "We are looking for an adjunct professor to teach undergraduate mathematics courses. This is a part-time position requiring 20 hours per week. The position offers hourly compensation.",
    salary: "$50 per hour",
    instructions:
      "Submit teaching portfolio and references. Part-time schedule available.",
    qualifications:
      "Master's degree in Mathematics required. Teaching experience preferred.",
  };

  try {
    const result2 = await enrichmentService.extractJobDetails(
      testJob2.title,
      testJob2.description,
      testJob2.salary,
      testJob2.instructions,
      testJob2.qualifications
    );

    console.log("Result:", JSON.stringify(result2, null, 2));
    console.log("✅ Test 2 completed\n");
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }

  // Test case 3: Regular full-time position
  console.log("📋 Test Case 3: Regular full-time position");
  const testJob3 = {
    title: "Assistant Professor of Physics",
    description:
      "The Department of Physics invites applications for a tenure-track Assistant Professor position. This is a full-time position with competitive salary and benefits. The university provides full funding for research activities.",
    salary: "Competitive salary commensurate with experience",
    instructions:
      "Submit CV, research statement, teaching statement, and three letters of recommendation.",
    qualifications:
      "PhD in Physics required. Strong research record and teaching ability expected.",
  };

  try {
    const result3 = await enrichmentService.extractJobDetails(
      testJob3.title,
      testJob3.description,
      testJob3.salary,
      testJob3.instructions,
      testJob3.qualifications
    );

    console.log("Result:", JSON.stringify(result3, null, 2));
    console.log("✅ Test 3 completed\n");
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }

  console.log("🎉 All tests completed!");
}

// Run the test
testJobDetailsExtraction().catch(console.error);
