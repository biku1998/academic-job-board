import { Ollama } from "ollama";
import { ZodType } from "zod";
import { config } from "@/config";
import {
  BaseEnrichmentService,
  BaseEnrichmentResponse,
} from "./base-enrichment";
import { OpenSourceSearchService } from "./open-source-search";

export type OllamaEnrichmentResponse<T> = BaseEnrichmentResponse<T>;

export class OllamaEnrichmentService implements BaseEnrichmentService {
  private ollama: Ollama;
  private searchService: OpenSourceSearchService;
  private readonly model = "llama3.2:3b";

  constructor() {
    this.ollama = new Ollama({
      host: config.ollamaUrl || "http://127.0.0.1:11434",
    });
    this.searchService = new OpenSourceSearchService();
    console.log(`🔗 Connecting to Ollama at: ${config.ollamaUrl}`);
    console.log(`🤖 Using model: ${this.model}`);
    console.log(`🔍 Using open-source search (DuckDuckGo + fallbacks)`);
  }

  /**
   * Initialize and verify model availability
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔍 Checking if ${this.model} is available...`);
      const installedModels = await this.ollama.list();
      const isModelAvailable = installedModels.models.some(
        (m) => m.name === this.model
      );

      if (!isModelAvailable) {
        throw new Error(`Model ${this.model} is not available on the Ollama instance`);
      }

      console.log(`✅ Model ${this.model} is available and ready`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.model}:`, error);
      throw error;
    }
  }

  /**
   * Generate schema example for the model
   */
  private generateSchemaExample(_schema: ZodType<unknown>): string {
    return `\n\nExample JSON response format:\n{\n  "field1": "value1",\n  "field2": "value2",\n  "confidence": 0.85\n}`;
  }

  /**
   * Format prompt for the model
   */
  private formatPromptForModel(
    prompt: string,
    schema: ZodType<unknown>,
    enableTools: boolean = false
  ): string {
    let formattedPrompt = prompt;

    // Add schema example
    formattedPrompt += this.generateSchemaExample(schema);

    // Add tool calling instructions if enabled
    if (enableTools) {
      formattedPrompt += `\n\nIf you need additional information to complete this task, you can request a web search by including this line in your response:\nTOOL: web_search: [your search query]\n\nOtherwise, provide the JSON response directly.`;
    }

    // Add final instruction
    formattedPrompt += `\n\nReturn only the JSON object, no other text or explanation.`;

    return formattedPrompt;
  }

  /**
   * Call Ollama with the specified model
   */
  private async callOllama(
    prompt: string,
    schema: ZodType<unknown>,
    temperature = 0.1,
    enableTools = false
  ): Promise<string> {
    try {
      console.log(`🤖 Calling ${this.model}...`);

      const response = await this.ollama.chat({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a precise data extraction assistant specializing in academic job postings. Always respond with valid JSON objects only.",
          },
          {
            role: "user",
            content: prompt,
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
                false // Disable tools for the second call
              );

              const finalResponse = await this.ollama.chat({
                model: this.model,
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
              console.log(`✅ LLM provided final response after web search`);
            } else {
              console.warn(`⚠️  Web search failed, using original response`);
            }
          } catch (error) {
            console.warn(`⚠️  Web search failed:`, error);
          }
        }
      }

      return responseText;
    } catch (error) {
      console.error(`❌ Ollama call failed:`, error);
      throw error;
    }
  }

  /**
   * Extract JSON from response text
   */
  private extractJSON(text: string): object | null {
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // If no JSON found, try to parse the entire text
      return JSON.parse(text);
    } catch (error) {
      console.warn(`⚠️  Failed to extract JSON from response:`, error);
      console.warn(`📝 Raw response:`, text);
      return null;
    }
  }

  /**
   * Perform web search using open source search service
   */
  private async webSearch(query: string): Promise<string | null> {
    try {
      const results = await this.searchService.search(query);
      return results;
    } catch (error) {
      console.warn(`⚠️  Web search failed:`, error);
      return null;
    }
  }

  /**
   * Main enrichment method
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
    // Ensure model is initialized
    try {
      await this.initialize();
    } catch (error) {
      console.error(`❌ Model initialization failed:`, error);
      return {
        data: null,
        source: "none",
        confidence: 0,
      };
    }

    // Phase 1: Try with input text only (with intelligent tool calling)
    try {
      const fullPrompt = `${prompt}\n\nInput Text:\n${inputText.substring(0, 2000)}`;
      const response = await this.callOllama(fullPrompt, schema, 0.1, true);
      const jsonData = this.extractJSON(response);

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
          const enhancedPrompt = `${prompt}\n\nInput Text:\n${inputText.substring(0, 1500)}\n\nAdditional Context:\n${webResults}`;
          const response = await this.callOllama(enhancedPrompt, schema, 0.1, false);
          const jsonData = this.extractJSON(response);

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
    };
  }

  /**
   * Check if the service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get model status
   */
  async getModelStatus(): Promise<{ model: string; available: boolean }[]> {
    try {
      const installedModels = await this.ollama.list();
      return [
        {
          model: this.model,
          available: installedModels.models.some((m) => m.name === this.model),
        },
      ];
    } catch (error) {
      return [
        {
          model: this.model,
          available: false,
        },
      ];
    }
  }

  /**
   * Test connection to Ollama
   */
  async testConnection(): Promise<{
    connected: boolean;
    models: string[];
    error?: string;
  }> {
    try {
      const installedModels = await this.ollama.list();
      const isModelAvailable = installedModels.models.some(
        (m) => m.name === this.model
      );

      return {
        connected: true,
        models: installedModels.models.map((m) => m.name),
        error: isModelAvailable ? undefined : `Model ${this.model} not found`,
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
