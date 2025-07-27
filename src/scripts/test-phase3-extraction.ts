import "dotenv/config";
import { JobEnrichmentService } from "@/services/job-enrichment";

async function testPhase3Extraction() {
  console.log(
    "🧪 Testing Phase 3 Extraction (GeoLocation, Contact, Research Areas)...\n"
  );

  const enrichmentService = new JobEnrichmentService();

  if (!enrichmentService.isAvailable()) {
    console.log("❌ JobEnrichmentService is not available (no API key)");
    return;
  }

  // Test case 1: University position with specific location
  console.log("📋 Test Case 1: University position with specific location");
  const testJob1 = {
    title: "Assistant Professor of Computer Science",
    description: `The Department of Computer Science at Stanford University invites applications for a tenure-track Assistant Professor position.
    
    Research Focus:
    We seek candidates with expertise in artificial intelligence, machine learning, and data science. 
    The successful candidate will establish a strong research program in these areas.
    
    Contact Information:
    For questions about this position, please contact Dr. Sarah Johnson, Department Chair, at sjohnson@stanford.edu.
    
    Location:
    This position is located at Stanford University, Palo Alto, California.`,
    location: "Stanford University, Palo Alto, CA",
    instructions:
      "Submit application through AcademicJobsOnline. Contact Dr. Sarah Johnson for questions.",
  };

  try {
    const [geoLocation1, contact1, researchAreas1] = await Promise.all([
      enrichmentService.extractGeoLocation(
        testJob1.title,
        testJob1.description,
        testJob1.location
      ),
      enrichmentService.extractContact(
        testJob1.description,
        testJob1.instructions
      ),
      enrichmentService.extractResearchAreas(
        testJob1.title,
        testJob1.description
      ),
    ]);

    console.log("GeoLocation:", JSON.stringify(geoLocation1, null, 2));
    console.log("Contact:", JSON.stringify(contact1, null, 2));
    console.log("Research Areas:", JSON.stringify(researchAreas1, null, 2));
    console.log("✅ Test 1 completed\n");
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }

  // Test case 2: International position
  console.log("📋 Test Case 2: International position");
  const testJob2 = {
    title: "Professor of Physics",
    description: `The Department of Physics at the University of Tokyo invites applications for a Professor position.
    
    Research Areas:
    We are looking for candidates with expertise in quantum physics, particle physics, and theoretical physics.
    The position involves research in quantum computing and quantum information theory.
    
    Contact:
    For inquiries, please email physics-search@u-tokyo.ac.jp or contact Professor Tanaka, Search Committee Chair.
    
    Location:
    This position is located at the University of Tokyo, Tokyo, Japan.`,
    location: "University of Tokyo, Tokyo, Japan",
    instructions:
      "Submit applications via email to physics-search@u-tokyo.ac.jp",
  };

  try {
    const [geoLocation2, contact2, researchAreas2] = await Promise.all([
      enrichmentService.extractGeoLocation(
        testJob2.title,
        testJob2.description,
        testJob2.location
      ),
      enrichmentService.extractContact(
        testJob2.description,
        testJob2.instructions
      ),
      enrichmentService.extractResearchAreas(
        testJob2.title,
        testJob2.description
      ),
    ]);

    console.log("GeoLocation:", JSON.stringify(geoLocation2, null, 2));
    console.log("Contact:", JSON.stringify(contact2, null, 2));
    console.log("Research Areas:", JSON.stringify(researchAreas2, null, 2));
    console.log("✅ Test 2 completed\n");
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }

  // Test case 3: Remote position with minimal information
  console.log("📋 Test Case 3: Remote position with minimal information");
  const testJob3 = {
    title: "Postdoctoral Researcher in Machine Learning",
    description: `We are seeking a postdoctoral researcher to join our machine learning research group.
    
    Research Focus:
    The position involves research in deep learning, neural networks, and computer vision.
    
    This is a remote position with occasional travel to our main office.
    
    Please submit your application through our online portal.`,
    location: "Remote",
    instructions: "Apply online through our portal",
  };

  try {
    const [geoLocation3, contact3, researchAreas3] = await Promise.all([
      enrichmentService.extractGeoLocation(
        testJob3.title,
        testJob3.description,
        testJob3.location
      ),
      enrichmentService.extractContact(
        testJob3.description,
        testJob3.instructions
      ),
      enrichmentService.extractResearchAreas(
        testJob3.title,
        testJob3.description
      ),
    ]);

    console.log("GeoLocation:", JSON.stringify(geoLocation3, null, 2));
    console.log("Contact:", JSON.stringify(contact3, null, 2));
    console.log("Research Areas:", JSON.stringify(researchAreas3, null, 2));
    console.log("✅ Test 3 completed\n");
  } catch (error) {
    console.error("❌ Test 3 failed:", error);
  }

  console.log("🎉 All Phase 3 tests completed!");
}

// Run the test
testPhase3Extraction().catch(console.error);
