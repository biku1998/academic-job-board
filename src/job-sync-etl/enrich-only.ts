import "dotenv/config";
import { runSequentialEnrichment } from "./job-orchestrator";
import { SequentialEnrichmentService } from "./sequential-enrichment";

const main = async () => {
  try {
    console.log("🎯 Starting sequential LLM enrichment on existing jobs...");

    // Get current status before starting
    const enrichmentService = new SequentialEnrichmentService();
    const initialProgress = await enrichmentService.getProgress();
    console.log("📊 Initial status:", {
      total: initialProgress.total,
      enriched: initialProgress.enriched,
      failed: initialProgress.failed,
      pending: initialProgress.pending,
    });

    if (initialProgress.pending === 0) {
      console.log("✅ No jobs pending enrichment. All done!");
      return;
    }

    // Run enrichment
    const enrichmentResult = await runSequentialEnrichment({
      continueOnError: true,
    });

    console.log("✅ Enrichment completed:", {
      jobsProcessed: enrichmentResult.enriched + enrichmentResult.failed,
      jobsEnriched: enrichmentResult.enriched,
      jobsFailed: enrichmentResult.failed,
      jobsPending: enrichmentResult.pending,
    });

    // Show final status
    console.log("\n📊 Final Status:");
    const finalProgress = await enrichmentService.getProgress();
    console.log(`Total jobs: ${finalProgress.total}`);
    console.log(`Enriched: ${finalProgress.enriched}`);
    console.log(`Failed: ${finalProgress.failed}`);
    console.log(`Pending: ${finalProgress.pending}`);
    console.log(`In Progress: ${finalProgress.inProgress}`);

    if (finalProgress.failed > 0) {
      console.log("\n⚠️  Some jobs failed. You can retry them later with:");
      console.log("npm run enrich-only");
    }
  } catch (error) {
    console.error("❌ Failed to complete enrichment:", error);
    process.exit(1);
  }
};

main();
