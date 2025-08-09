import { ZodType } from "zod";
import { config } from "@/config";
import { CohereClient } from "cohere-ai";
import axios from "axios";
import {
  BaseEnrichmentService,
  BaseEnrichmentResponse,
} from "./base-enrichment";

export type LLMEnrichmentResponse<T> = BaseEnrichmentResponse<T>;

export class LLMEnrichmentService implements BaseEnrichmentService {
  private cohere: CohereClient | null;

  constructor() {
    if (config.cohereApiKey) {
      this.cohere = new CohereClient({ token: config.cohereApiKey });
    } else {
      this.cohere = null;
    }
  }

  /**
   * Calls the LLM with tool-calling support (manual pattern for Cohere).
   * If the LLM responds with TOOL: web_search: <query>, this method will run the web search,
   * append the results to the prompt, and re-call the LLM for the final answer.
   * Only one tool call is allowed per invocation.
   */
  private async callLLM(
    prompt: string,
    tools: string[] = ["web_search"],
    temperature = 0.1
  ): Promise<string> {
    if (!this.cohere) throw new Error("Cohere client not initialized");
    // Add tool instructions to the prompt
    let toolInstructions = "";
    if (tools.includes("web_search")) {
      toolInstructions = `\nYou have access to the following tool:\n- web_search: Use this if you need to look up information on the internet.\nIf you cannot answer from the description, respond with:\nTOOL: web_search: <your search query>\n`;
    }
    const fullPrompt = toolInstructions + prompt;
    let response = await this.cohere.generate({
      model: "command-r-08-2024",
      prompt: fullPrompt,
      maxTokens: 1000,
      temperature,
      k: 0,
      stopSequences: [],
      returnLikelihoods: "NONE",
    });
    let text = response.generations[0].text.trim();
    // Check for tool call
    const toolMatch = text.match(/TOOL:\s*web_search:\s*(.+)/i);
    if (toolMatch && tools.includes("web_search")) {
      const searchQuery = toolMatch[1].trim();
      const webResults = await this.webSearch(searchQuery);
      // Re-prompt the LLM with the web results
      const webPrompt = `${prompt}\n\nWeb Search Results: ${webResults}\n\nReturn only the JSON object, no other text.`;
      response = await this.cohere.generate({
        model: "command-r-08-2024",
        prompt: webPrompt,
        maxTokens: 1000,
        temperature,
        k: 0,
        stopSequences: [],
        returnLikelihoods: "NONE",
      });
      text = response.generations[0].text.trim();
    }
    return text;
  }

  // Tavily web search implementation
  private async webSearch(query: string): Promise<string> {
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
      return results
        .slice(0, 3)
        .map((r, i) => `Result ${i + 1}: ${r.title}\n${r.snippet}`)
        .join("\n\n");
    } catch (error) {
      console.error("Tavily web search failed:", error);
      return "";
    }
  }

  /**
   * Generic enrichment method with tool-calling support.
   * If the LLM requests a tool (e.g., web_search), it will be invoked and the LLM will be re-prompted.
   * Only one tool call is allowed per enrichment.
   */
  async enrich<
    T extends Record<string, unknown>,
    K extends keyof T = "confidence"
  >({
    prompt,
    inputText,
    schema,
    webSearchQuery,
    confidenceKey = "confidence" as K,
    tools = ["web_search"],
  }: {
    prompt: string;
    inputText: string;
    schema: ZodType<T>;
    webSearchQuery?: string;
    confidenceKey?: K;
    tools?: string[];
  }): Promise<LLMEnrichmentResponse<T>> {
    // 1. Try to infer from input text, allow tool-calling
    const descriptionPrompt = `${prompt}\n\nDescription: ${inputText.substring(
      0,
      2000
    )}\n\nReturn only the JSON object, no other text.`;
    try {
      const response = await this.callLLM(descriptionPrompt, tools);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = schema.safeParse(JSON.parse(jsonMatch[0]));
        if (parsed.success) {
          const data = parsed.data;
          const confidence =
            typeof data[confidenceKey] === "number"
              ? (data[confidenceKey] as number)
              : 0;
          if (confidence > 0.5) {
            return {
              data,
              source: response.includes("Web Search Results:")
                ? "web"
                : "description",
              confidence,
            };
          }
        }
      }
    } catch {
      // fall through to web
    }

    // 2. Fallback: try web search if query provided (legacy/manual fallback)
    if (webSearchQuery) {
      try {
        const webResults = await this.webSearch(webSearchQuery);
        const webPrompt = `${prompt}\n\nWeb Search Results: ${webResults}\n\nReturn only the JSON object, no other text.`;
        const response = await this.callLLM(webPrompt, [], 0.1);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = schema.safeParse(JSON.parse(jsonMatch[0]));
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
      } catch {
        // fall through
      }
    }

    // 3. If all fails
    return {
      data: null,
      source: "none",
      confidence: 0,
      error: "Could not extract data with sufficient confidence",
    };
  }
}

/*
// Usage example for extracting job attributes:
import { z } from "zod";
const jobAttrSchema = z.object({
  category: z.string().nullable(),
  workModality: z.string().nullable(),
  contractType: z.string().nullable(),
  durationMonths: z.number().nullable(),
  renewable: z.boolean().nullable(),
  fundingSource: z.string().nullable(),
  visaSponsorship: z.boolean().nullable(),
  interviewProcess: z.string().nullable(),
  confidence: z.number(),
});

const llm = new LLMEnrichmentService();
const result = await llm.enrich({
  prompt: `Analyze this academic job posting and extract key attributes. Return ONLY a valid JSON object with the following structure: ...`,
  inputText: jobDescription,
  schema: jobAttrSchema,
  webSearchQuery: "[optional: query for web search]",
});
*/
