import "dotenv/config";
import { runRefactoredSync, runSequentialEnrichment } from "./job-orchestrator";
import { SequentialEnrichmentService } from "./sequential-enrichment";

const main = async () => {
  try {
    console.log("🚀 Starting two-phase job sync and enrichment...");

    // Phase 1: Extract, Transform, Load (Deterministic)
    console.log("\n📥 Phase 1: Extracting and loading jobs...");
    const syncResult = await runRefactoredSync({
      continueOnError: true,
      dryRun: false,
    });

    console.log("✅ Phase 1 completed:", {
      jobsExtracted: syncResult.extraction.success,
      jobsTransformed: syncResult.transformation.success,
      jobsLoaded: syncResult.loading.success,
      duration: `${(syncResult.duration / 1000).toFixed(1)}s`,
    });

    // Phase 2: Sequential LLM Enrichment
    console.log("\n🎯 Phase 2: Starting sequential LLM enrichment...");
    const enrichmentResult = await runSequentialEnrichment({
      continueOnError: true,
    });

    console.log("✅ Phase 2 completed:", {
      jobsProcessed: enrichmentResult.enriched + enrichmentResult.failed,
      jobsEnriched: enrichmentResult.enriched,
      jobsFailed: enrichmentResult.failed,
      jobsPending: enrichmentResult.pending,
    });

    // Show final status
    console.log("\n📊 Final Status:");
    const enrichmentService = new SequentialEnrichmentService();
    const progress = await enrichmentService.getProgress();
    console.log(`Total jobs: ${progress.total}`);
    console.log(`Enriched: ${progress.enriched}`);
    console.log(`Failed: ${progress.failed}`);
    console.log(`Pending: ${progress.pending}`);
    console.log(`In Progress: ${progress.inProgress}`);

    console.log("\n🎉 Two-phase sync and enrichment completed successfully!");
  } catch (error) {
    console.error("❌ Failed to complete sync and enrichment:", error);
    process.exit(1);
  }
};

main();
