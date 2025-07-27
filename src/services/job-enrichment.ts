import { config } from "@/config";
import { LLMEnrichmentService } from "./llm-enrichment";
import { PromptLoader } from "@/lib/prompt-loader";
import { z } from "zod";

export interface JobAttributes {
  category: string | null;
  workModality: string | null;
  contractType: string | null;
  durationMonths: number | null;
  renewable: boolean | null;
  fundingSource: string | null;
  visaSponsorship: boolean | null;
  interviewProcess: string | null;
  confidence: number;
}

export interface ApplicationRequirements {
  documentTypes: string[];
  referenceLettersRequired: number | null;
  platform: string | null;
  confidence: number;
}

export interface LanguageRequirements {
  languages: string[];
  confidence: number;
}

export interface SuitableBackgrounds {
  backgrounds: string[];
  confidence: number;
}

export interface KeywordExtraction {
  keywords: string[];
  confidence: number;
}

// Zod schemas for validation
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

const applicationReqSchema = z.object({
  documentTypes: z.array(z.string()),
  referenceLettersRequired: z.number().nullable(),
  platform: z.string().nullable(),
  confidence: z.number(),
});

const languageReqSchema = z.object({
  languages: z.array(z.string()),
  confidence: z.number(),
});

const suitableBackgroundsSchema = z.object({
  backgrounds: z.array(z.string()),
  confidence: z.number(),
});

const keywordExtractionSchema = z.object({
  keywords: z.array(z.string()),
  confidence: z.number(),
});

export class JobEnrichmentService {
  private llmService: LLMEnrichmentService | null;

  constructor() {
    if (config.cohereApiKey) {
      this.llmService = new LLMEnrichmentService();
    } else {
      this.llmService = null;
      console.warn(
        "⚠️  No COHERE_API_KEY found, JobEnrichmentService will not be available"
      );
    }
  }

  /**
   * Check if the service is available (has API key)
   */
  isAvailable(): boolean {
    return this.llmService !== null;
  }

  /**
   * Extract keywords from job content using LLM
   */
  async extractKeywords(
    title: string,
    description: string,
    qualifications: string
  ): Promise<KeywordExtraction> {
    if (!this.llmService) {
      return {
        keywords: [],
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("keyword-extraction");
      const combinedText = `Job Title: ${title}\n\nDescription: ${description.substring(
        0,
        1500
      )}\n\nQualifications: ${qualifications.substring(0, 1000)}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON array of keywords, no other text.`,
        inputText: combinedText,
        schema: keywordExtractionSchema,
        webSearchQuery: `${title} ${description.substring(0, 100)}`,
      });

      if (enrichment.data && enrichment.confidence > 0.3) {
        return {
          keywords: enrichment.data.keywords || [],
          confidence: enrichment.confidence,
        };
      }

      return {
        keywords: [],
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting keywords:", error);
      return {
        keywords: [],
        confidence: 0,
      };
    }
  }

  /**
   * Extract job attributes using LLM
   */
  async extractJobAttributes(
    title: string,
    description: string,
    salary: string
  ): Promise<JobAttributes> {
    if (!this.llmService) {
      return {
        category: null,
        workModality: null,
        contractType: null,
        durationMonths: null,
        renewable: null,
        fundingSource: null,
        visaSponsorship: null,
        interviewProcess: null,
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("job-attributes");
      const combinedText = `Job Title: ${title}\nSalary: ${salary}\nDescription: ${description.substring(
        0,
        2000
      )}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object, no other text.`,
        inputText: combinedText,
        schema: jobAttrSchema,
        webSearchQuery: `${title} ${salary}`,
      });

      if (enrichment.data && enrichment.confidence > 0.5) {
        return {
          category: enrichment.data.category || null,
          workModality: enrichment.data.workModality || null,
          contractType: enrichment.data.contractType || null,
          durationMonths: enrichment.data.durationMonths || null,
          renewable: enrichment.data.renewable || null,
          fundingSource: enrichment.data.fundingSource || null,
          visaSponsorship: enrichment.data.visaSponsorship || null,
          interviewProcess: enrichment.data.interviewProcess || null,
          confidence: enrichment.confidence,
        };
      }

      return {
        category: null,
        workModality: null,
        contractType: null,
        durationMonths: null,
        renewable: null,
        fundingSource: null,
        visaSponsorship: null,
        interviewProcess: null,
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting job attributes:", error);
      return {
        category: null,
        workModality: null,
        contractType: null,
        durationMonths: null,
        renewable: null,
        fundingSource: null,
        visaSponsorship: null,
        interviewProcess: null,
        confidence: 0,
      };
    }
  }

  /**
   * Extract application requirements using LLM
   */
  async extractApplicationRequirements(
    description: string
  ): Promise<ApplicationRequirements> {
    if (!this.llmService) {
      return {
        documentTypes: [],
        referenceLettersRequired: null,
        platform: null,
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("application-requirements");

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nDescription: ${description.substring(
          0,
          2000
        )}\n\nReturn only the JSON object, no other text.`,
        inputText: description,
        schema: applicationReqSchema,
      });

      if (enrichment.data && enrichment.confidence > 0.5) {
        return {
          documentTypes: enrichment.data.documentTypes || [],
          referenceLettersRequired:
            enrichment.data.referenceLettersRequired || null,
          platform: enrichment.data.platform || null,
          confidence: enrichment.confidence,
        };
      }

      return {
        documentTypes: [],
        referenceLettersRequired: null,
        platform: null,
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting application requirements:", error);
      return {
        documentTypes: [],
        referenceLettersRequired: null,
        platform: null,
        confidence: 0,
      };
    }
  }

  /**
   * Extract language requirements using LLM
   */
  async extractLanguageRequirements(
    description: string
  ): Promise<LanguageRequirements> {
    if (!this.llmService) {
      return {
        languages: [],
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("language-requirements");

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nDescription: ${description.substring(
          0,
          2000
        )}\n\nReturn only the JSON object, no other text.`,
        inputText: description,
        schema: languageReqSchema,
      });

      if (enrichment.data && enrichment.confidence > 0.5) {
        return {
          languages: enrichment.data.languages || [],
          confidence: enrichment.confidence,
        };
      }

      return {
        languages: [],
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting language requirements:", error);
      return {
        languages: [],
        confidence: 0,
      };
    }
  }

  /**
   * Extract suitable backgrounds using LLM
   */
  async extractSuitableBackgrounds(
    description: string
  ): Promise<SuitableBackgrounds> {
    if (!this.llmService) {
      return {
        backgrounds: [],
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("suitable-backgrounds");

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nDescription: ${description.substring(
          0,
          2000
        )}\n\nReturn only the JSON object, no other text.`,
        inputText: description,
        schema: suitableBackgroundsSchema,
      });

      if (enrichment.data && enrichment.confidence > 0.5) {
        return {
          backgrounds: enrichment.data.backgrounds || [],
          confidence: enrichment.confidence,
        };
      }

      return {
        backgrounds: [],
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting suitable backgrounds:", error);
      return {
        backgrounds: [],
        confidence: 0,
      };
    }
  }
}
