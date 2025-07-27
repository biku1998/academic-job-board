import "dotenv/config";
import { PromptLoader } from "@/job-sync-etl/services/prompt-loader";

async function testPrompts() {
  try {
    console.log("🧪 Testing Prompt Loading System...");

    // Test getting available prompts
    const availablePrompts = PromptLoader.getAvailablePrompts();
    console.log("📋 Available prompts:", availablePrompts);

    // Test loading each prompt
    for (const promptName of availablePrompts) {
      console.log(`\n📄 Testing prompt: ${promptName}`);

      try {
        const fullContent = PromptLoader.loadPrompt(promptName);
        const content = PromptLoader.getPromptContent(promptName);

        console.log(`✅ Successfully loaded '${promptName}'`);
        console.log(`📏 Full content length: ${fullContent.length} characters`);
        console.log(`📏 Content length: ${content.length} characters`);
        console.log(`📝 Content preview: ${content.substring(0, 100)}...`);
      } catch (error) {
        console.error(`❌ Failed to load '${promptName}':`, error);
      }
    }

    console.log("\n🎉 Prompt loading tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testPrompts();
