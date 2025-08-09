import { Ollama } from "ollama";
import { ZodType } from "zod";
import { config, ollamaModels } from "@/config";
import {
  BaseEnrichmentService,
  BaseEnrichmentResponse,
} from "./base-enrichment";
import { OpenSourceSearchService } from "./open-source-search";

export type OllamaEnrichmentResponse<T> = BaseEnrichmentResponse<T>;

export class OllamaEnrichmentService implements BaseEnrichmentService {
  private ollama: Ollama;
  private availableModels: string[] = [];
  private currentModelIndex: number = 0;
  private searchService: OpenSourceSearchService;

  constructor() {
    this.ollama = new Ollama({
      host: config.ollamaUrl || "http://127.0.0.1:11434",
    });
    this.searchService = new OpenSourceSearchService();
    console.log(`🔗 Connecting to Ollama at: ${config.ollamaUrl}`);
    console.log(`🔍 Using open-source search (DuckDuckGo + fallbacks)`);
  }

  /**
   * Initialize and check available models from config
   */
  async initialize(): Promise<void> {
    try {
      console.log("🔍 Checking available models on remote Ollama instance...");
      const installedModels = await this.ollama.list();
      const installedModelNames = installedModels.models.map((m) => m.name);

      console.log(
        `📋 Models installed on remote instance: ${installedModelNames.join(
          ", "
        )}`
      );

      // Filter config models to only include installed ones, maintaining order
      this.availableModels = ollamaModels.filter((modelName) =>
        installedModelNames.some(
          (installed) =>
            installed.includes(modelName.split(":")[0]) ||
            installed === modelName
        )
      );

      if (this.availableModels.length === 0) {
        console.error(
          `❌ None of the configured models are available on remote instance`
        );
        console.error(`📝 Configured models: ${ollamaModels.join(", ")}`);
        console.error(`📝 Available models: ${installedModelNames.join(", ")}`);
        throw new Error(
          `None of the configured models are available: ${ollamaModels.join(
            ", "
          )}`
        );
      }

      console.log(
        `✅ Available Ollama models in preference order: ${this.availableModels.join(
          ", "
        )}`
      );
      this.currentModelIndex = 0;
    } catch (error) {
      console.error("❌ Failed to initialize Ollama models:", error);
      throw error;
    }
  }

  /**
   * Get current preferred model
   */
  private getCurrentModel(): string {
    if (this.availableModels.length === 0) {
      throw new Error("No available models initialized");
    }
    return this.availableModels[this.currentModelIndex];
  }

  /**
   * Try next model in preference order
   */
  private tryNextModel(): boolean {
    if (this.currentModelIndex < this.availableModels.length - 1) {
      this.currentModelIndex++;
      console.log(`🔄 Switching to fallback model: ${this.getCurrentModel()}`);
      return true;
    }
    return false;
  }

  /**
   * Reset to primary model
   */
  private resetToPrimaryModel(): void {
    this.currentModelIndex = 0;
  }

  /**
   * Generate schema example for prompts
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateSchemaExample(_schema: ZodType<unknown>): string {
    // Simple schema example - could be enhanced based on actual schema
    // In the future, this could introspect the schema to generate better examples
    return `{"field1": "value", "field2": null, "confidence": 0.85}`;
  }

  /**
   * Enhanced prompt engineering for different models with tool calling support
   */
  private formatPromptForModel(
    prompt: string,
    schema: ZodType<unknown>,
    modelName: string,
    enableTools: boolean = false
  ): string {
    const schemaExample = this.generateSchemaExample(schema);

    // Model-specific prompt optimization
    let modelSpecificInstructions = "";

    if (modelName.includes("deepseek")) {
      modelSpecificInstructions = `
DEEPSEEK SPECIFIC INSTRUCTIONS:
- Think step by step before providing the JSON
- Focus on accuracy and precision
- Use your reasoning capabilities to infer missing information
- Provide your final answer as a clean JSON object at the end`;
    } else if (modelName.includes("mistral")) {
      modelSpecificInstructions = `
MISTRAL SPECIFIC INSTRUCTIONS:
- Be concise and direct in your analysis
- Focus on extracting explicit information first
- Provide confident assessments
- Output clean JSON without additional commentary`;
    }

    // Add tool calling instructions if enabled
    let toolInstructions = "";
    if (enableTools) {
      toolInstructions = `
AVAILABLE TOOLS:
You have access to web search if you need additional information not available in the input text.

If you cannot extract sufficient information from the provided text alone, you can request a web search by responding with:
TOOL: web_search: <your specific search query>

Only use this tool if the input text lacks crucial information needed for accurate extraction.

TOOL USAGE GUIDELINES:
- Only use web_search if information is missing or unclear
- Make your search query specific and relevant
- After getting search results, provide the final JSON response
`;
    }

    return `${prompt}

${toolInstructions}${modelSpecificInstructions}

CRITICAL OUTPUT REQUIREMENTS:
1. ${
      enableTools
        ? "Either respond with a tool call (TOOL: web_search: <query>) OR "
        : ""
    }Respond with ONLY a valid JSON object
2. No explanatory text, markdown, or code blocks (except for tool calls)
3. Match this exact structure: ${schemaExample}
4. Use null for missing values (not undefined or empty strings)
5. Ensure confidence score reflects actual certainty (0.0-1.0)
6. All string values must be properly quoted
7. Numbers must be valid (not NaN or Infinity)

Response: ${enableTools ? "Tool call OR " : ""}Pure JSON object only`;
  }

  /**
   * Core LLM call with model fallback and tool calling support
   */
  private async callOllamaWithFallback(
    prompt: string,
    schema: ZodType<unknown>,
    temperature = 0.1,
    maxRetries = 2,
    enableTools = false
  ): Promise<string> {
    let lastError: Error | null = null;

    // Try each available model
    for (
      let modelAttempt = 0;
      modelAttempt < this.availableModels.length;
      modelAttempt++
    ) {
      const currentModel = this.getCurrentModel();
      const modelSpecificPrompt = this.formatPromptForModel(
        prompt,
        schema,
        currentModel,
        enableTools
      );

      // Retry current model a few times before switching
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `🤖 Attempting with model: ${currentModel} (attempt ${attempt})`
          );

          const response = await this.ollama.chat({
            model: currentModel,
            messages: [
              {
                role: "system",
                content:
                  "You are a precise data extraction assistant specializing in academic job postings. Always respond with valid JSON objects only.",
              },
              {
                role: "user",
                content: modelSpecificPrompt,
              },
            ],
            options: {
              temperature,
              top_p: 0.9,
              num_predict: 1000,
              num_ctx: 4096, // Context window
            },
            stream: false,
          });

          let responseText = response.message.content.trim();

          // Handle tool calling if enabled
          if (enableTools) {
            const toolMatch = responseText.match(/TOOL:\s*web_search:\s*(.+)/i);
            if (toolMatch) {
              const searchQuery = toolMatch[1].trim();
              console.log(`🔍 LLM requested web search: "${searchQuery}"`);

              try {
                const webResults = await this.webSearch(searchQuery);
                if (webResults) {
                  // Re-prompt with search results
                  const enhancedPrompt = this.formatPromptForModel(
                    `${prompt}\n\nWeb Search Results:\n${webResults}\n\nNow provide the final JSON response based on the original input and search results.`,
                    schema,
                    currentModel,
                    false // Disable tools for the second call
                  );

                  const finalResponse = await this.ollama.chat({
                    model: currentModel,
                    messages: [
                      {
                        role: "system",
                        content:
                          "You are a precise data extraction assistant. Provide the final JSON response based on the input and search results.",
                      },
                      {
                        role: "user",
                        content: enhancedPrompt,
                      },
                    ],
                    options: {
                      temperature,
                      top_p: 0.9,
                      num_predict: 1000,
                      num_ctx: 4096,
                    },
                    stream: false,
                  });

                  responseText = finalResponse.message.content.trim();
                  console.log(
                    `✅ LLM provided final response after web search`
                  );
                } else {
                  console.warn(
                    `⚠️  Web search returned no results for: "${searchQuery}"`
                  );
                  // Continue with original response if web search fails
                }
              } catch (error) {
                console.warn(`❌ Tool calling failed:`, error);
                // Continue with original response if tool calling fails
              }
            }
          }

          // Reset to primary model on success
          this.resetToPrimaryModel();
          return responseText;
        } catch (error) {
          lastError = error as Error;
          console.warn(
            `Model ${currentModel} attempt ${attempt} failed:`,
            error
          );

          if (attempt < maxRetries) {
            // Short delay before retry with same model
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Try next model if available
      if (!this.tryNextModel()) {
        break;
      }
    }

    // Reset to primary model for next call
    this.resetToPrimaryModel();
    throw lastError || new Error("All models failed");
  }

  /**
   * Enhanced JSON extraction with model-specific handling
   */
  private extractJSON(text: string, modelName: string): object | null {
    // DeepSeek sometimes includes reasoning, extract JSON from the end
    if (modelName.includes("deepseek")) {
      // Look for JSON at the end of the response
      const lines = text.split("\n");
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith("{")) {
          try {
            return JSON.parse(line);
          } catch {}
        }
      }
    }

    // Standard extraction strategies
    const strategies = [
      // Strategy 1: Direct parse
      () => JSON.parse(text),

      // Strategy 2: Extract from code blocks
      () => {
        const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        return match ? JSON.parse(match[1]) : null;
      },

      // Strategy 3: Find JSON object in text
      () => {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
      },

      // Strategy 4: Clean and parse
      () => {
        const cleaned = text
          .replace(/```json|```/g, "")
          .replace(/^\s*[\w\s:]*?(\{)/m, "$1")
          .trim();
        return JSON.parse(cleaned);
      },
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result) return result;
      } catch {}
    }

    return null;
  }

  /**
   * Web search using open-source alternatives (DuckDuckGo + fallbacks)
   */
  private async webSearch(query: string): Promise<string> {
    try {
      console.log(`🔍 Performing open-source web search for: "${query}"`);
      const searchResponse = await this.searchService.search(query, 3);

      if (searchResponse.results.length === 0) {
        console.warn(`⚠️  No search results found for: "${query}"`);
        return "";
      }

      const formattedResults = this.searchService.formatForLLM(searchResponse);
      console.log(
        `✅ Found ${searchResponse.results.length} results from ${searchResponse.source}`
      );

      return formattedResults;
    } catch (error) {
      console.error("Open-source web search failed:", error);
      return "";
    }
  }

  /**
   * Main enrichment method with model fallback
   */
  async enrich<T extends Record<string, unknown>>({
    prompt,
    inputText,
    schema,
    webSearchQuery,
    confidenceKey = "confidence" as keyof T,
  }: {
    prompt: string;
    inputText: string;
    schema: ZodType<T>;
    webSearchQuery?: string;
    confidenceKey?: keyof T;
  }): Promise<OllamaEnrichmentResponse<T>> {
    // Ensure models are initialized
    if (this.availableModels.length === 0) {
      await this.initialize();
    }

    // Phase 1: Try with input text only (with intelligent tool calling)
    try {
      const fullPrompt = `${prompt}\n\nInput Text:\n${inputText.substring(
        0,
        2000
      )}`;
      const response = await this.callOllamaWithFallback(
        fullPrompt,
        schema,
        0.1,
        2,
        true // Enable intelligent tool calling
      );
      const jsonData = this.extractJSON(response, this.getCurrentModel());

      if (jsonData) {
        const parsed = schema.safeParse(jsonData);
        if (parsed.success) {
          const data = parsed.data;
          const confidence =
            typeof data[confidenceKey] === "number"
              ? (data[confidenceKey] as number)
              : 0;

          if (confidence > 0.5) {
            return {
              data,
              source: "description",
              confidence,
            };
          }
        } else {
          console.warn("Schema validation failed:", parsed.error);
        }
      }
    } catch (error) {
      console.warn("Phase 1 enrichment failed:", error);
    }

    // Phase 2: Try with web search enhancement
    if (webSearchQuery) {
      try {
        const webResults = await this.webSearch(webSearchQuery);
        if (webResults) {
          const enhancedPrompt = `${prompt}\n\nInput Text:\n${inputText.substring(
            0,
            1500
          )}\n\nAdditional Context:\n${webResults}`;
          const response = await this.callOllamaWithFallback(
            enhancedPrompt,
            schema,
            0.1,
            2,
            false // Disable tools for manual fallback
          );
          const jsonData = this.extractJSON(response, this.getCurrentModel());

          if (jsonData) {
            const parsed = schema.safeParse(jsonData);
            if (parsed.success) {
              const data = parsed.data;
              const confidence =
                typeof data[confidenceKey] === "number"
                  ? (data[confidenceKey] as number)
                  : 0;

              return {
                data,
                source: "web",
                confidence,
              };
            }
          }
        }
      } catch (error) {
        console.warn("Phase 2 enrichment failed:", error);
      }
    }

    return {
      data: null,
      source: "none",
      confidence: 0,
      error: "Could not extract structured data with sufficient confidence",
    };
  }

  /**
   * Health check with model availability
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (this.availableModels.length === 0) {
        await this.initialize();
      }
      return this.availableModels.length > 0;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Get status of all configured models
   */
  async getModelStatus(): Promise<{ model: string; available: boolean }[]> {
    try {
      const installedModels = await this.ollama.list();
      const installedModelNames = installedModels.models.map((m) => m.name);

      return ollamaModels.map((model) => ({
        model,
        available: installedModelNames.some(
          (installed) =>
            installed.includes(model.split(":")[0]) || installed === model
        ),
      }));
    } catch {
      return ollamaModels.map((model) => ({ model, available: false }));
    }
  }

  /**
   * Test connection to remote Ollama instance
   */
  async testConnection(): Promise<{
    connected: boolean;
    models: string[];
    error?: string;
  }> {
    try {
      console.log(`🔗 Testing connection to Ollama at: ${config.ollamaUrl}`);
      const result = await this.ollama.list();
      const models = result.models.map((m) => m.name);

      return {
        connected: true,
        models,
      };
    } catch (error) {
      return {
        connected: false,
        models: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
