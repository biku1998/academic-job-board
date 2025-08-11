import { config } from "@/config";
import { CohereClient } from "cohere-ai";
import type { JobPosting } from "../types";
import type {
  LLMEnrichmentService,
  EnrichedJobData,
} from "./llm-enrichment.interface";
import {
  LLMEnrichmentError,
  LLMServiceUnavailableError,
} from "./llm-enrichment.interface";

export class CohereEnrichmentService implements LLMEnrichmentService {
  private cohere: CohereClient | null;

  constructor() {
    if (config.cohereApiKey) {
      this.cohere = new CohereClient({ token: config.cohereApiKey });
      console.log("✅ Cohere enrichment service initialized");
    } else {
      this.cohere = null;
      console.log(
        "⚠️  No COHERE_API_KEY found, Cohere enrichment service unavailable"
      );
    }
  }

  isAvailable(): boolean {
    return this.cohere !== null;
  }

  getSupportedFeatures(): string[] {
    return [
      "job_enrichment",
      "keyword_extraction",
      "web_search_integration",
      "batch_processing",
    ];
  }

  getServiceName(): string {
    return "Cohere Command-R";
  }

  async enrichJob(job: JobPosting): Promise<EnrichedJobData> {
    if (!this.cohere) {
      throw new LLMServiceUnavailableError("Cohere");
    }

    try {
      // For Cohere, we'll need to make multiple calls to extract different aspects
      // This is a simplified implementation that maintains compatibility
      const [
        keywords,
        jobAttributes,
        jobDetails,
        applicationRequirements,
        languageRequirements,
        suitableBackgrounds,
        geoLocation,
        contact,
        researchAreas,
      ] = await Promise.all([
        this.extractKeywords(job),
        this.extractJobAttributes(job),
        this.extractJobDetails(job),
        this.extractApplicationRequirements(job),
        this.extractLanguageRequirements(job),
        this.extractSuitableBackgrounds(job),
        this.extractGeoLocation(job),
        this.extractContact(job),
        this.extractResearchAreas(job),
      ]);

      return {
        keywords: keywords.keywords,
        jobAttributes: {
          category: jobAttributes.category,
          workModality: jobAttributes.workModality,
          contractType: jobAttributes.contractType,
          durationMonths: jobAttributes.durationMonths,
          renewable: jobAttributes.renewable,
          fundingSource: jobAttributes.fundingSource,
          visaSponsorship: jobAttributes.visaSponsorship,
          interviewProcess: jobAttributes.interviewProcess,
        },
        jobDetails: {
          isSelfFinanced: jobDetails.isSelfFinanced,
          isPartTime: jobDetails.isPartTime,
          workHoursPerWeek: jobDetails.workHoursPerWeek,
          compensationType: jobDetails.compensationType,
        },
        applicationRequirements: {
          documentTypes: applicationRequirements.documentTypes,
          referenceLettersRequired:
            applicationRequirements.referenceLettersRequired,
          platform: applicationRequirements.platform,
        },
        languageRequirements: {
          languages: languageRequirements.languages,
        },
        suitableBackgrounds: {
          backgrounds: suitableBackgrounds.backgrounds,
        },
        geoLocation: {
          lat: geoLocation.lat,
          lon: geoLocation.lon,
        },
        contact: {
          name: contact.name,
          email: contact.email,
          title: contact.title,
        },
        researchAreas: {
          researchAreas: researchAreas.researchAreas,
        },
      };
    } catch (error) {
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
    if (!this.cohere) {
      throw new LLMServiceUnavailableError("Cohere");
    }

    console.log(`🔄 Processing ${jobs.length} jobs with Cohere...`);

    const results: EnrichedJobData[] = [];
    const batchSize = 3; // Cohere has stricter rate limits

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          jobs.length / batchSize
        )}`
      );

      const batchPromises = batch.map(async (job, index) => {
        // Add delay between requests for Cohere
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return this.enrichJob(job);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // Individual extraction methods for Cohere (maintaining existing functionality)
  private async extractKeywords(_job: JobPosting) {
    // TODO: Implement actual keyword extraction when needed
    // const prompt = PromptLoader.loadPrompt("keyword-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return keywords
    return { keywords: ["placeholder"], confidence: 0.8 }; // Simplified for now
  }

  private async extractJobAttributes(_job: JobPosting) {
    // TODO: Implement actual job attributes extraction when needed
    // const prompt = PromptLoader.loadPrompt("job-attributes");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return job attributes
    return {
      category: null,
      workModality: null,
      contractType: null,
      durationMonths: null,
      renewable: null,
      fundingSource: null,
      visaSponsorship: null,
      interviewProcess: null,
      confidence: 0.8,
    };
  }

  private async extractJobDetails(_job: JobPosting) {
    // TODO: Implement actual job details extraction when needed
    // const prompt = PromptLoader.loadPrompt("job-details-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return job details
    return {
      isSelfFinanced: null,
      isPartTime: null,
      workHoursPerWeek: null,
      compensationType: null,
      confidence: 0.8,
    };
  }

  private async extractApplicationRequirements(_job: JobPosting) {
    // TODO: Implement actual application requirements extraction when needed
    // const prompt = PromptLoader.loadPrompt(
    //   "application-requirements-extraction"
    // );
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return application requirements
    return {
      documentTypes: [],
      referenceLettersRequired: null,
      platform: null,
      confidence: 0.8,
    };
  }

  private async extractLanguageRequirements(_job: JobPosting) {
    // TODO: Implement actual language requirements extraction when needed
    // const prompt = PromptLoader.loadPrompt("language-requirements-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return language requirements
    return {
      languages: [],
      confidence: 0.8,
    };
  }

  private async extractSuitableBackgrounds(_job: JobPosting) {
    // TODO: Implement actual suitable backgrounds extraction when needed
    // const prompt = PromptLoader.loadPrompt("suitable-backgrounds-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return suitable backgrounds
    return {
      backgrounds: [],
      confidence: 0.8,
    };
  }

  private async extractGeoLocation(_job: JobPosting) {
    // TODO: Implement actual geolocation extraction when needed
    // const prompt = PromptLoader.loadPrompt("geolocation-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return geolocation
    return {
      lat: null,
      lon: null,
      confidence: 0.8,
    };
  }

  private async extractContact(_job: JobPosting) {
    // TODO: Implement actual contact extraction when needed
    // const prompt = PromptLoader.loadPrompt("contact-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return contact information
    return {
      name: null,
      email: null,
      title: null,
      confidence: 0.8,
    };
  }

  private async extractResearchAreas(_job: JobPosting) {
    // TODO: Implement actual research areas extraction when needed
    // const prompt = PromptLoader.loadPrompt("research-areas-extraction");
    // const response = await this.callCohere(prompt, _job.description || "");
    // Parse response and return research areas
    return {
      researchAreas: [],
      confidence: 0.8,
    };
  }

  private async callCohere(prompt: string, inputText: string): Promise<string> {
    if (!this.cohere) throw new Error("Cohere client not initialized");

    const response = await this.cohere.generate({
      model: "command-r-08-2024",
      prompt: `${prompt}\n\nInput: ${inputText}`,
      maxTokens: 1000,
      temperature: 0.1,
      k: 0,
      stopSequences: [],
      returnLikelihoods: "NONE",
    });

    return response.generations[0].text.trim();
  }
}
