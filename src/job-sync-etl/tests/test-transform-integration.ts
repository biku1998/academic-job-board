import "dotenv/config";
import { transformJobs } from "@/job-sync-etl/transform";
import type { JobPosting } from "@/job-sync-etl/types";

// Mock job posting data for testing
const mockJobPostings: JobPosting[] = [
  {
    id: 1,
    g: 1,
    name: "Assistant Professor in Computer Science",
    univ: "Example University",
    url: "https://example.edu/job/1",
    description: `
      <p>The Department of Computer Science at Example University invites applications for a tenure-track Assistant Professor position in Computer Science, with a focus on artificial intelligence and machine learning.</p>
      
      <p><strong>Position Details:</strong></p>
      <ul>
        <li>Full-time, tenure-track position</li>
        <li>Start date: Fall 2024</li>
        <li>Salary: Competitive and commensurate with experience</li>
      </ul>
      
      <p><strong>Requirements:</strong></p>
      <ul>
        <li>Ph.D. in Computer Science or related field</li>
        <li>Strong research record in AI/ML</li>
        <li>Teaching experience preferred</li>
      </ul>
    `,
    deadline_raw: "2024-12-31",
    unit_name: "Computer Science Department",
    disc: "Computer Science",
    close_date_raw: "2024-12-31",
    salary: "Competitive",
    stat: 1,
    location: "California, USA",
    tag: "assistantprofessor",
    instructions: "Please submit your application through our online portal",
    open_date_raw: "2024-01-01",
    legacy_position_id: 12345,
    qualifications:
      "Ph.D. in Computer Science or related field required. Strong research record in AI/ML preferred.",
    apply: "https://example.edu/apply/1",
  },
];

async function testTransformIntegration() {
  console.log("🧪 Testing Transform Integration with Ollama...");

  try {
    console.log(
      `📊 Processing ${mockJobPostings.length} mock job posting(s)...`
    );

    const transformedData = await transformJobs(mockJobPostings);

    if (!transformedData) {
      console.error("❌ Transform returned null data");
      return;
    }

    console.log("\n✅ Transform completed successfully!");
    console.log("📊 Transform Results:");
    console.log(`  🏛️  Institutions: ${transformedData.institutions.size}`);
    console.log(`  🏢 Departments: ${transformedData.departments.size}`);
    console.log(`  📚 Disciplines: ${transformedData.disciplines.size}`);
    console.log(`  💼 Job Postings: ${transformedData.jobPostings.length}`);
    console.log(`  🏷️  Keywords: ${transformedData.keywords.size}`);

    // Show sample data
    if (transformedData.jobPostings.length > 0) {
      const sampleJob = transformedData.jobPostings[0];
      console.log("\n📋 Sample Job Data:");
      console.log(`  Title: ${sampleJob.title}`);
      console.log(
        `  Keywords: ${sampleJob.keywords.slice(0, 5).join(", ")}${
          sampleJob.keywords.length > 5 ? "..." : ""
        }`
      );
      console.log(`  Category: ${sampleJob.category || "N/A"}`);
      console.log(`  Job Type: ${sampleJob.jobType || "N/A"}`);
      console.log(`  Seniority: ${sampleJob.seniorityLevel || "N/A"}`);

      // Show enriched data if available
      if (sampleJob.applicationRequirements?.documentTypes?.length > 0) {
        console.log(
          `  📄 Application Requirements: ${sampleJob.applicationRequirements.documentTypes.join(
            ", "
          )}`
        );
      }

      if (sampleJob.languageRequirements?.languages?.length > 0) {
        console.log(
          `  🗣️  Language Requirements: ${sampleJob.languageRequirements.languages.join(
            ", "
          )}`
        );
      }
    }

    console.log("\n🎉 Transform integration test completed successfully!");
  } catch (error) {
    console.error("❌ Transform integration test failed:", error);
    console.error("\n🛠️  This might indicate:");
    console.error("1. Issues with the transform pipeline");
    console.error("2. Ollama service connectivity problems");
    console.error("3. Model processing errors");
  }
}

testTransformIntegration().catch(console.error);
