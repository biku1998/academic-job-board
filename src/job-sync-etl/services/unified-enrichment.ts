import OpenAI from "openai";
import { z } from "zod";
import { config } from "@/config";
import type {
  LLMEnrichmentService,
  EnrichedJobData,
} from "./llm-enrichment.interface";
import type { JobPosting } from "../types";
import { PromptLoader } from "./prompt-loader";
import axios from "axios";

// Zod schema for OpenAI structured output with native validation
const EnrichedJobDataSchema = z.object({
  keywords: z.array(z.string()),
  jobAttributes: z.object({
    category: z.string().nullable(),
    workModality: z.string().nullable(),
    contractType: z.string().nullable(),
    durationMonths: z.number().nullable(),
    renewable: z.boolean().nullable(),
    fundingSource: z.string().nullable(),
    visaSponsorship: z.boolean().nullable(),
    interviewProcess: z.string().nullable(),
  }),
  jobDetails: z.object({
    isSelfFinanced: z.boolean().nullable(),
    isPartTime: z.boolean().nullable(),
    workHoursPerWeek: z.number().nullable(),
    compensationType: z.string().nullable(),
  }),
  applicationRequirements: z.object({
    documentTypes: z.array(z.string()),
    referenceLettersRequired: z.number().nullable(),
    platform: z.string().nullable(),
  }),
  languageRequirements: z.object({
    languages: z.array(z.string()),
  }),
  suitableBackgrounds: z.object({
    backgrounds: z.array(z.string()),
  }),
  geoLocation: z.object({
    lat: z.number().nullable(),
    lon: z.number().nullable(),
  }),
  contact: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    title: z.string().nullable(),
  }),
  researchAreas: z.object({
    researchAreas: z.array(z.string()),
  }),
});

export class UnifiedEnrichmentService implements LLMEnrichmentService {
  private openai!: OpenAI;
  private promptLoader: PromptLoader;
  private isServiceAvailable: boolean;

  constructor() {
    this.promptLoader = new PromptLoader();

    if (config.openAiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openAiApiKey,
      });
      this.isServiceAvailable = true;
      console.log("✅ Unified OpenAI enrichment service initialized");
    } else {
      this.isServiceAvailable = false;
      console.warn("⚠️  OpenAI API key not configured for unified enrichment");
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.isServiceAvailable;
  }

  /**
   * Get the service name
   */
  getServiceName(): string {
    return "Unified OpenAI Enrichment (Web Search + Tool Calling)";
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): string[] {
    return [
      "unified-enrichment",
      "web-search-integration",
      "comprehensive-extraction",
      "cost-optimized",
      "zod-schema-validation",
      "tool-calling",
      "web-search-tool",
    ];
  }

  /**
   * Enrich a single job with ALL data in one LLM call
   */
  async enrichJob(job: JobPosting): Promise<EnrichedJobData> {
    if (!this.isServiceAvailable) {
      throw new Error("Unified enrichment service is not available");
    }

    try {
      console.log(`🤖 Unified enrichment for job: ${job.name}`);

      // Load the unified prompt template
      const promptTemplate = await PromptLoader.loadPrompt(
        "unified-enrichment"
      );

      // Replace placeholders in the prompt
      const prompt = promptTemplate
        .replace("${job.name}", job.name || "")
        .replace("${job.univ}", job.univ || "")
        .replace(
          "${job.unit_name || job.disc}",
          (job.unit_name || job.disc || "").trim()
        )
        .replace(
          "${job.location || 'Not specified'}",
          job.location || "Not specified"
        )
        .replace(
          "${job.salary || 'Not specified'}",
          job.salary || "Not specified"
        )
        .replace(
          "${job.description || 'No description'}",
          job.description || "No description"
        )
        .replace(
          "${job.qualifications || 'Not specified'}",
          job.qualifications || "Not specified"
        )
        .replace(
          "${job.instructions || 'Not provided'}",
          job.instructions || "Not provided"
        );

      // Make single LLM call with web search tool calling support
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert academic job analyst. Extract comprehensive information from job postings. You can use web search tools to get additional context about institutions, locations, or academic terms when needed.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 2000, // Sufficient for comprehensive output
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description:
                "Search the web for additional context about institutions, locations, academic terms, or other relevant information",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to find additional context",
                  },
                },
                required: ["query"],
              },
            },
          },
        ],
        tool_choice: "auto", // Allow the model to decide when to use tools
      });

      const responseMessage = completion.choices[0]?.message;
      if (!responseMessage) {
        throw new Error("No response message from OpenAI");
      }

      // Handle tool calling if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log("🔍 Web search tool called, processing tool calls...");
        return await this.handleToolCalls(responseMessage, job, prompt);
      }

      // Handle direct response (no tool calls)
      const responseContent = responseMessage.content;
      if (!responseContent) {
        throw new Error("No response content from OpenAI");
      }

      // Parse the response and validate against our Zod schema
      let enrichedData: EnrichedJobData;
      try {
        const parsedData = JSON.parse(responseContent);

        // Validate against our Zod schema
        const validationResult = EnrichedJobDataSchema.safeParse(parsedData);
        if (!validationResult.success) {
          console.error("Zod validation failed:", validationResult.error);
          throw new Error(
            `Schema validation failed: ${validationResult.error.message}`
          );
        }

        enrichedData = validationResult.data;
      } catch (parseError) {
        console.error(
          "Failed to parse or validate OpenAI response:",
          responseContent
        );
        throw new Error(`Response processing failed: ${parseError}`);
      }

      // Data is validated and ready to use
      console.log(`✅ Unified enrichment completed for: ${job.name}`);
      return enrichedData;
    } catch (error) {
      console.error(`❌ Unified enrichment failed for job ${job.name}:`, error);
      throw error;
    }
  }

  /**
   * Enrich multiple jobs in batch (for compatibility)
   */
  async enrichJobs(jobs: JobPosting[]): Promise<EnrichedJobData[]> {
    const results: EnrichedJobData[] = [];

    // Process jobs sequentially to avoid overwhelming the API
    for (const job of jobs) {
      try {
        const enrichedData = await this.enrichJob(job);
        results.push(enrichedData);

        // Small delay between jobs to be respectful to the API
        if (jobs.indexOf(job) < jobs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to enrich job ${job.name}:`, error);
        // Return empty data structure for failed jobs
        results.push(this.getEmptyEnrichedData());
      }
    }

    return results;
  }

  /**
   * Handle tool calls from OpenAI (web search)
   */
  private async handleToolCalls(
    responseMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    job: JobPosting,
    originalPrompt: string
  ): Promise<EnrichedJobData> {
    try {
      // Process each tool call
      if (!responseMessage.tool_calls) {
        throw new Error("No tool calls found in response message");
      }

      for (const toolCall of responseMessage.tool_calls) {
        if (
          toolCall.type === "function" &&
          toolCall.function.name === "web_search"
        ) {
          const args = JSON.parse(toolCall.function.arguments);
          const searchQuery = args.query;

          console.log(`🔍 Performing web search for: "${searchQuery}"`);
          const webSearchResults = await this.performWebSearch(searchQuery);

          // Create a new prompt with web search results
          const enhancedPrompt = `${originalPrompt}\n\nWeb Search Results for "${searchQuery}":\n${webSearchResults}\n\nUse this additional context to improve your analysis. Return the JSON object with all extracted information.`;

          // Make another API call with the enhanced context
          const enhancedCompletion = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert academic job analyst. Extract comprehensive information from job postings using the provided context and web search results.",
              },
              {
                role: "user",
                content: enhancedPrompt,
              },
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: "json_object" },
          });

          const enhancedContent =
            enhancedCompletion.choices[0]?.message?.content;
          if (!enhancedContent) {
            throw new Error("No enhanced response content from OpenAI");
          }

          // Parse and validate the enhanced response
          const parsedData = JSON.parse(enhancedContent);
          const validationResult = EnrichedJobDataSchema.safeParse(parsedData);
          if (!validationResult.success) {
            console.error(
              "Enhanced response validation failed:",
              validationResult.error
            );
            throw new Error(
              `Enhanced response validation failed: ${validationResult.error.message}`
            );
          }

          console.log(
            `✅ Enhanced enrichment completed with web search for: ${job.name}`
          );
          return validationResult.data;
        }
      }

      throw new Error("No supported tool calls found");
    } catch (error) {
      console.error("Tool call handling failed:", error);
      throw error;
    }
  }

  /**
   * Perform web search using Tavily API
   */
  private async performWebSearch(query: string): Promise<string> {
    if (!config.tavilyApiKey) {
      throw new Error("Tavily API key not set in environment variables");
    }

    try {
      const response = await axios.post(
        "https://api.tavily.com/search",
        {
          query,
          search_depth: "advanced",
          include_answer: false,
          include_raw_content: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.tavilyApiKey}`,
          },
        }
      );

      const results: Array<{ title: string; snippet: string }> =
        response.data.results || [];

      // Summarize top 3 results (title + snippet)
      if (results.length === 0) {
        return "No web search results found.";
      }

      return results
        .slice(0, 3)
        .map((r, i) => `Result ${i + 1}: ${r.title}\n${r.snippet}`)
        .join("\n\n");
    } catch (error) {
      console.error("Tavily web search failed:", error);
      return "Web search failed. Proceeding with available information.";
    }
  }

  // Note: OpenAI's response_format ensures JSON output, but we still need to validate against our Zod schema

  /**
   * Get empty enriched data structure
   */
  private getEmptyEnrichedData(): EnrichedJobData {
    return {
      keywords: [],
      jobAttributes: {
        category: null,
        workModality: null,
        contractType: null,
        durationMonths: null,
        renewable: null,
        fundingSource: null,
        visaSponsorship: null,
        interviewProcess: null,
      },
      jobDetails: {
        isSelfFinanced: null,
        isPartTime: null,
        workHoursPerWeek: null,
        compensationType: null,
      },
      applicationRequirements: {
        documentTypes: [],
        referenceLettersRequired: null,
        platform: null,
      },
      languageRequirements: {
        languages: [],
      },
      suitableBackgrounds: {
        backgrounds: [],
      },
      geoLocation: {
        lat: null,
        lon: null,
      },
      contact: {
        name: null,
        email: null,
        title: null,
      },
      researchAreas: {
        researchAreas: [],
      },
    };
  }
}
