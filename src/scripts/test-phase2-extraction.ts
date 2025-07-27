import "dotenv/config";
import { JobEnrichmentService } from "@/services/job-enrichment";

async function testPhase2Extraction() {
  console.log(
    "🧪 Testing Phase 2 Extraction (Application Requirements, Language Requirements, Suitable Backgrounds)...\n"
  );

  const enrichmentService = new JobEnrichmentService();

  if (!enrichmentService.isAvailable()) {
    console.log("❌ JobEnrichmentService is not available (no API key)");
    return;
  }

  // Test case 1: Comprehensive job with all Phase 2 requirements
  console.log(
    "📋 Test Case 1: Comprehensive job with all Phase 2 requirements"
  );
  const testJob1 = {
    title: "Assistant Professor of Computer Science",
    description: `The Department of Computer Science invites applications for a tenure-track Assistant Professor position. 
    
    Required Documents:
    - Curriculum Vitae
    - Research Statement (3-5 pages)
    - Teaching Statement (2-3 pages)
    - Diversity Statement (1-2 pages)
    - Three letters of recommendation
    
    Application Process:
    Please submit all materials through AcademicJobsOnline. Applications must be submitted by December 1st.
    
    Language Requirements:
    All teaching and research activities will be conducted in English. Fluency in English is required.
    
    Suitable Backgrounds:
    We seek candidates with a PhD in Computer Science, Computer Engineering, or related fields. 
    Preferred areas include: Machine Learning, Artificial Intelligence, Data Science, Software Engineering.
    
    The successful candidate will be expected to teach undergraduate and graduate courses in computer science, 
    establish a strong research program, and contribute to departmental service.`,
  };

  try {
    const [appReqs1, langReqs1, backgrounds1] = await Promise.all([
      enrichmentService.extractApplicationRequirements(testJob1.description),
      enrichmentService.extractLanguageRequirements(testJob1.description),
      enrichmentService.extractSuitableBackgrounds(testJob1.description),
    ]);

    console.log("Application Requirements:", JSON.stringify(appReqs1, null, 2));
    console.log("Language Requirements:", JSON.stringify(langReqs1, null, 2));
    console.log("Suitable Backgrounds:", JSON.stringify(backgrounds1, null, 2));
    console.log("✅ Test 1 completed\n");
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }

  // Test case 2: International position with language requirements
  console.log(
    "📋 Test Case 2: International position with language requirements"
  );
  const testJob2 = {
    title: "Professor of Spanish Literature",
    description: `The Department of Modern Languages seeks a Professor of Spanish Literature.
    
    Language Requirements:
    Native or near-native proficiency in Spanish and English required. 
    Teaching will be conducted in both languages.
    
    Application Requirements:
    Submit CV, research statement, and two letters of recommendation via email to chair@university.edu.
    
    Suitable Backgrounds:
    PhD in Spanish Literature, Hispanic Studies, or Comparative Literature required.
    Specialization in 20th century Latin American literature preferred.`,
  };

  try {
    const [appReqs2, langReqs2, backgrounds2] = await Promise.all([
      enrichmentService.extractApplicationRequirements(testJob2.description),
      enrichmentService.extractLanguageRequirements(testJob2.description),
      enrichmentService.extractSuitableBackgrounds(testJob2.description),
    ]);

    console.log("Application Requirements:", JSON.stringify(appReqs2, null, 2));
    console.log("Language Requirements:", JSON.stringify(langReqs2, null, 2));
    console.log("Suitable Backgrounds:", JSON.stringify(backgrounds2, null, 2));
    console.log("✅ Test 2 completed\n");
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }

  // Test case 3: Minimal requirements job
  console.log("📋 Test Case 3: Minimal requirements job");
  const testJob3 = {
    title: "Postdoctoral Researcher",
    description: `We are seeking a postdoctoral researcher to join our physics research group.
    
    The successful candidate will conduct research in experimental particle physics and 
    contribute to ongoing experiments at CERN.
    
    Please submit your application materials through our online portal.
    
    Candidates with backgrounds in Physics, Engineering, or related fields are encouraged to apply.`,
  };

  try {
    const [appReqs3, langReqs3, backgrounds3] = await Promise.all([
      enrichmentService.extractApplicationRequirements(testJob3.description),
      enrichmentService.extractLanguageRequirements(testJob3.description),
      enrichmentService.extractSuitableBackgrounds(testJob3.description),
    ]);

    console.log("Application Requirements:", JSON.stringify(appReqs3, null, 2));
    console.log("Language Requirements:", JSON.stringify(langReqs3, null, 2));
    console.log("Suitable Backgrounds:", JSON.stringify(backgrounds3, null, 2));
    console.log("✅ Test 3 completed\n");
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }

  console.log("🎉 All Phase 2 tests completed!");
}

// Run the test
testPhase2Extraction().catch(console.error);
