import fs from "fs";
import path from "path";

export class PromptLoader {
  private static promptsDir = path.join(process.cwd(), "src", "prompts");

  /**
   * Load a prompt from a markdown file
   * @param promptName - Name of the prompt file (without .md extension)
   * @returns The prompt content as a string
   */
  static loadPrompt(promptName: string): string {
    const promptPath = path.join(this.promptsDir, `${promptName}.md`);

    try {
      const content = fs.readFileSync(promptPath, "utf-8");
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to load prompt '${promptName}': ${error}`);
    }
  }

  /**
   * Get the content of a prompt file, excluding the markdown formatting
   * @param promptName - Name of the prompt file (without .md extension)
   * @returns The prompt content without markdown headers and formatting
   */
  static getPromptContent(promptName: string): string {
    const fullContent = this.loadPrompt(promptName);

    // Remove markdown headers and formatting, keep only the actual prompt content
    const lines = fullContent.split("\n");
    const contentLines = lines.filter((line) => {
      // Skip markdown headers (lines starting with #)
      if (line.trim().startsWith("#")) return false;
      // Skip empty lines at the beginning
      if (line.trim() === "") return false;
      return true;
    });

    return contentLines.join("\n").trim();
  }

  /**
   * Get available prompt names
   * @returns Array of available prompt names
   */
  static getAvailablePrompts(): string[] {
    try {
      const files = fs.readdirSync(this.promptsDir);
      return files
        .filter((file) => file.endsWith(".md"))
        .map((file) => file.replace(".md", ""));
    } catch (error) {
      console.warn(`Could not read prompts directory: ${error}`);
      return [];
    }
  }
}
