import "dotenv/config";
import { config, ollamaModels } from "@/config";
import { OllamaEnrichmentService } from "@/job-sync-etl/services/ollama-enrichment";

async function testOllamaConnection() {
  console.log("🧪 Testing Remote Ollama Connection...");
  console.log(`🔗 Connecting to: ${config.ollamaUrl}`);
  console.log(`📋 Expected models: ${ollamaModels.join(", ")}`);

  const service = new OllamaEnrichmentService();

  try {
    // Test basic connection
    console.log("\n🔍 Step 1: Testing basic connection...");
    const connectionTest = await service.testConnection();

    if (!connectionTest.connected) {
      console.error("❌ Failed to connect to remote Ollama instance");
      console.error(`📝 Error: ${connectionTest.error}`);
      console.error("\n🛠️  Troubleshooting:");
      console.error("1. Verify OLLAMA_URL is correct in your .env file");
      console.error("2. Ensure the remote Ollama service is running");
      console.error("3. Check network connectivity");
      console.error("4. Verify firewall settings allow connections");
      return;
    }

    console.log("✅ Successfully connected to remote Ollama instance");
    console.log(`📋 Available models: ${connectionTest.models.join(", ")}`);

    // Test model initialization
    console.log("\n🔍 Step 2: Testing model initialization...");
    await service.initialize();

    const modelStatus = await service.getModelStatus();
    console.log("\n📊 Model Status Report:");
    modelStatus.forEach(({ model, available }) => {
      console.log(
        `  ${available ? "✅" : "❌"} ${model} ${
          available ? "(Available)" : "(Not available)"
        }`
      );
    });

    const availableCount = modelStatus.filter((m) => m.available).length;
    if (availableCount === 0) {
      console.error(
        "\n❌ None of the configured models are available on the remote instance"
      );
      console.error(
        "🛠️  Please install the required models on the remote machine:"
      );
      ollamaModels.forEach((model) => {
        console.error(`   ollama pull ${model}`);
      });
      return;
    }

    console.log(
      `\n✅ ${availableCount}/${ollamaModels.length} configured models are available`
    );

    // Test health check
    console.log("\n🔍 Step 3: Testing health check...");
    const isHealthy = await service.isHealthy();
    console.log(
      `🏥 Health Status: ${isHealthy ? "✅ Healthy" : "❌ Unhealthy"}`
    );

    if (isHealthy) {
      console.log("\n🎉 Remote Ollama connection test completed successfully!");
      console.log("✅ Ready to proceed with the migration");
    } else {
      console.error("\n❌ Health check failed - service may not be ready");
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    console.error("\n🛠️  Common issues and solutions:");
    console.error(
      "1. OLLAMA_URL format should be: http://hostname:port (usually port 11434)"
    );
    console.error("2. Remote Ollama service must be running: `ollama serve`");
    console.error("3. If using Docker, ensure ports are properly exposed");
    console.error("4. Check if the remote machine allows external connections");
  }
}

// Run the test
testOllamaConnection().catch(console.error);
