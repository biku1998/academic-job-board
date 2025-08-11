import { runBatchETL } from "./batch-etl-orchestrator";

async function main() {
  console.log("🚀 Starting Batch ETL Process...");
  console.log("=".repeat(50));

  try {
    const result = await runBatchETL({
      // Batch processing options
      pageSize: 5, // Process 5 jobs at a time
      maxPages: 3, // Process up to 3 pages (15 jobs total)
      devBreakAfter: 2, // Stop after 2 batches for testing

      // LLM enrichment options
      enableLLMEnrichment: true, // Enable LLM enrichment for each batch

      // General options
      continueOnError: true, // Continue on individual batch failures
      dryRun: false, // Actually save to database
    });

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Batch ETL Process Completed!");
    console.log("📊 Final Results:");
    console.log(`   📦 Total Batches: ${result.totalBatches}`);
    console.log(`   ✅ Successful: ${result.successfulBatches}`);
    console.log(`   ❌ Failed: ${result.failedBatches}`);
    console.log(`   📋 Jobs Processed: ${result.totalJobsProcessed}`);
    console.log(`   💾 Jobs Saved: ${result.totalJobsSaved}`);
    console.log(`   ⚠️  Jobs Failed: ${result.totalJobsFailed}`);
    console.log(`   ⏱️  Duration: ${result.duration}ms`);

    if (result.errors.length > 0) {
      console.log("\n❌ Errors encountered:");
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error in batch ETL process:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
