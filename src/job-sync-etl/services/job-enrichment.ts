import { config } from "@/config";
import { LLMEnrichmentService } from "./llm-enrichment";
import { PromptLoader } from "@/job-sync-etl/services/prompt-loader";
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

export interface JobDetails {
  isSelfFinanced: boolean | null;
  isPartTime: boolean | null;
  workHoursPerWeek: number | null;
  compensationType: string | null;
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

export interface GeoLocation {
  lat: number | null;
  lon: number | null;
  confidence: number;
}

export interface Contact {
  name: string | null;
  email: string | null;
  title: string | null;
  confidence: number;
}

export interface ResearchAreas {
  researchAreas: string[];
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

const jobDetailsSchema = z.object({
  isSelfFinanced: z.boolean().nullable(),
  isPartTime: z.boolean().nullable(),
  workHoursPerWeek: z.number().nullable(),
  compensationType: z.string().nullable(),
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

const geoLocationSchema = z.object({
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  confidence: z.number(),
});

const contactSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  title: z.string().nullable(),
  confidence: z.number(),
});

const researchAreasSchema = z.object({
  researchAreas: z.array(z.string()),
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
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object with keywords and confidence, no other text.`,
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
   * Extract job details (Phase 1 fields) using LLM with web search
   */
  async extractJobDetails(
    title: string,
    description: string,
    salary: string,
    instructions: string,
    qualifications: string
  ): Promise<JobDetails> {
    if (!this.llmService) {
      return {
        isSelfFinanced: null,
        isPartTime: null,
        workHoursPerWeek: null,
        compensationType: null,
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("job-details-extraction");
      const combinedText = `Job Title: ${title}\n\nDescription: ${description.substring(
        0,
        1500
      )}\n\nSalary: ${salary}\n\nInstructions: ${instructions.substring(
        0,
        500
      )}\n\nQualifications: ${qualifications.substring(0, 500)}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object with the extracted details, no other text.`,
        inputText: combinedText,
        schema: jobDetailsSchema,
        webSearchQuery: `${title} ${salary} employment conditions funding requirements`,
      });

      if (enrichment.data && enrichment.confidence > 0.3) {
        return {
          isSelfFinanced: enrichment.data.isSelfFinanced,
          isPartTime: enrichment.data.isPartTime,
          workHoursPerWeek: enrichment.data.workHoursPerWeek,
          compensationType: enrichment.data.compensationType,
          confidence: enrichment.confidence,
        };
      }

      return {
        isSelfFinanced: null,
        isPartTime: null,
        workHoursPerWeek: null,
        compensationType: null,
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting job details:", error);
      return {
        isSelfFinanced: null,
        isPartTime: null,
        workHoursPerWeek: null,
        compensationType: null,
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
        webSearchQuery: `application requirements ${description.substring(
          0,
          100
        )}`,
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
        webSearchQuery: `language requirements ${description.substring(
          0,
          100
        )}`,
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
        webSearchQuery: `academic background requirements ${description.substring(
          0,
          100
        )}`,
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

  /**
   * Extract geolocation using LLM with web search
   */
  async extractGeoLocation(
    title: string,
    description: string,
    location: string
  ): Promise<GeoLocation> {
    if (!this.llmService) {
      return {
        lat: null,
        lon: null,
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("geolocation-extraction");
      const combinedText = `Job Title: ${title}\n\nDescription: ${description.substring(
        0,
        1000
      )}\n\nLocation: ${location}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object with coordinates, no other text.`,
        inputText: combinedText,
        schema: geoLocationSchema,
        webSearchQuery: `${location} coordinates latitude longitude`,
      });

      if (enrichment.data && enrichment.confidence > 0.3) {
        return {
          lat: enrichment.data.lat,
          lon: enrichment.data.lon,
          confidence: enrichment.confidence,
        };
      }

      return {
        lat: null,
        lon: null,
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting geolocation:", error);
      return {
        lat: null,
        lon: null,
        confidence: 0,
      };
    }
  }

  /**
   * Extract contact information using LLM with web search
   */
  async extractContact(
    description: string,
    instructions: string
  ): Promise<Contact> {
    if (!this.llmService) {
      return {
        name: null,
        email: null,
        title: null,
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("contact-extraction");
      const combinedText = `Description: ${description.substring(
        0,
        1500
      )}\n\nInstructions: ${instructions.substring(0, 500)}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object with contact information, no other text.`,
        inputText: combinedText,
        schema: contactSchema,
        webSearchQuery: `contact information ${description.substring(0, 100)}`,
      });

      if (enrichment.data && enrichment.confidence > 0.3) {
        return {
          name: enrichment.data.name,
          email: enrichment.data.email,
          title: enrichment.data.title,
          confidence: enrichment.confidence,
        };
      }

      return {
        name: null,
        email: null,
        title: null,
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting contact information:", error);
      return {
        name: null,
        email: null,
        title: null,
        confidence: 0,
      };
    }
  }

  /**
   * Extract research areas using LLM with web search
   */
  async extractResearchAreas(
    title: string,
    description: string
  ): Promise<ResearchAreas> {
    if (!this.llmService) {
      return {
        researchAreas: [],
        confidence: 0,
      };
    }

    try {
      const prompt = PromptLoader.getPromptContent("research-areas-extraction");
      const combinedText = `Job Title: ${title}\n\nDescription: ${description.substring(
        0,
        2000
      )}`;

      const enrichment = await this.llmService.enrich({
        prompt: `${prompt}\n\nJob Content:\n${combinedText}\n\nReturn only the JSON object with research areas, no other text.`,
        inputText: combinedText,
        schema: researchAreasSchema,
        webSearchQuery: `research areas ${title} ${description.substring(
          0,
          100
        )}`,
      });

      if (enrichment.data && enrichment.confidence > 0.3) {
        return {
          researchAreas: enrichment.data.researchAreas || [],
          confidence: enrichment.confidence,
        };
      }

      return {
        researchAreas: [],
        confidence: enrichment.confidence,
      };
    } catch (error) {
      console.error("Error extracting research areas:", error);
      return {
        researchAreas: [],
        confidence: 0,
      };
    }
  }
}
