import OpenAI from "openai";
import { z } from "zod";
import { config } from "@/config";
import type { JobPosting } from "../types";
import type {
  LLMEnrichmentService,
  EnrichedJobData,
} from "./llm-enrichment.interface";
import {
  LLMEnrichmentError,
  LLMServiceUnavailableError,
  LLMValidationError,
} from "./llm-enrichment.interface";
import { PromptLoader } from "./prompt-loader";

// Zod schema for OpenAI structured output
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

export class OpenAIEnrichmentService implements LLMEnrichmentService {
  private openai: OpenAI | null;
  private readonly model = "gpt-4o-mini";
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor() {
    if (config.openAiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openAiApiKey,
      });
      console.log("✅ OpenAI enrichment service initialized");
    } else {
      this.openai = null;
      console.log(
        "⚠️  No OPENAI_API_KEY found, OpenAI enrichment service unavailable"
      );
    }
  }

  isAvailable(): boolean {
    return this.openai !== null;
  }

  getSupportedFeatures(): string[] {
    return [
      "job_enrichment",
      "keyword_extraction",
      "structured_output",
      "batch_processing",
    ];
  }

  getServiceName(): string {
    return "OpenAI GPT-4o-mini";
  }

  async enrichJob(job: JobPosting): Promise<EnrichedJobData> {
    if (!this.openai) {
      throw new LLMServiceUnavailableError("OpenAI");
    }

    try {
      const prompt = await this.buildEnrichmentPrompt(job);

      const response = await this.callOpenAIWithRetry(prompt);

      // Parse and validate the response
      const parsedData = this.parseAndValidateResponse(response, job.id);

      return parsedData;
    } catch (error) {
      if (error instanceof LLMEnrichmentError) {
        throw error;
      }

      throw new LLMEnrichmentError(
        `Failed to enrich job ${job.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "enrich_job",
        job.id,
        error instanceof Error ? error : undefined
      );
    }
  }

  async enrichJobs(jobs: JobPosting[]): Promise<EnrichedJobData[]> {
    if (!this.openai) {
      throw new LLMServiceUnavailableError("OpenAI");
    }

    console.log(`🔄 Processing ${jobs.length} jobs with OpenAI...`);

    const results: EnrichedJobData[] = [];
    const batchSize = 5; // Process in small batches to avoid rate limits

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          jobs.length / batchSize
        )}`
      );

      const batchPromises = batch.map(async (job, index) => {
        // Add small delay between requests to be respectful
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return this.enrichJob(job);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private async buildEnrichmentPrompt(job: JobPosting): Promise<string> {
    const basePrompt = PromptLoader.loadPrompt("job-enrichment");

    // Replace template variables in the prompt
    return basePrompt
      .replace(/\${job\.name}/g, job.name || "Not specified")
      .replace(/\${job\.univ}/g, job.univ || "Not specified")
      .replace(
        /\${job\.unit_name \|\| job\.disc}/g,
        job.unit_name || job.disc || "Not specified"
      )
      .replace(
        /\${job\.location \|\| 'Not specified'}/g,
        job.location || "Not specified"
      )
      .replace(
        /\${job\.salary \|\| 'Not specified'}/g,
        job.salary || "Not specified"
      )
      .replace(
        /\${job\.description \|\| 'No description'}/g,
        job.description || "No description provided"
      )
      .replace(
        /\${job\.qualifications \|\| 'Not specified'}/g,
        job.qualifications || "No qualifications specified"
      )
      .replace(
        /\${job\.instructions \|\| 'Not provided'}/g,
        job.instructions || "No instructions provided"
      );
  }

  private async callOpenAIWithRetry(prompt: string): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.openai!.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert academic job analyst. Always return valid JSON in the exact structure requested. Be precise and concise.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new LLMEnrichmentError(
      `OpenAI API call failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      "openai_api_call",
      undefined,
      lastError
    );
  }

  private parseAndValidateResponse(
    response: string,
    jobId: number
  ): EnrichedJobData {
    try {
      const jsonData = JSON.parse(response);

      const validationResult = EnrichedJobDataSchema.safeParse(jsonData);

      if (!validationResult.success) {
        const validationErrors = validationResult.error.issues.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );

        throw new LLMValidationError(
          "Response validation failed",
          "parse_response",
          jobId,
          validationErrors
        );
      }

      return validationResult.data;
    } catch (error) {
      if (error instanceof LLMValidationError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new LLMValidationError(
          "Invalid JSON response from OpenAI",
          "parse_response",
          jobId,
          [error.message]
        );
      }

      throw new LLMEnrichmentError(
        `Failed to parse OpenAI response: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "parse_response",
        jobId,
        error instanceof Error ? error : undefined
      );
    }
  }
}
