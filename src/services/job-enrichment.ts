import { config } from "@/config";
import { CohereClient } from "cohere-ai";

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

export class JobEnrichmentService {
  private cohere: CohereClient | null;

  constructor() {
    if (config.cohereApiKey) {
      this.cohere = new CohereClient({ token: config.cohereApiKey });
    } else {
      this.cohere = null;
    }
  }

  private async callCohere(
    prompt: string,
    temperature: number = 0.1
  ): Promise<string> {
    if (!this.cohere) {
      throw new Error("Cohere client not initialized");
    }

    try {
      const response = await this.cohere.generate({
        model: "command-r-08-2024",
        prompt: prompt,
        maxTokens: 1000,
        temperature: temperature,
        k: 0,
        stopSequences: [],
        returnLikelihoods: "NONE",
      });

      return response.generations[0].text.trim();
    } catch (error) {
      console.error("Error calling Cohere API:", error);
      throw error;
    }
  }

  async extractJobAttributes(
    title: string,
    description: string,
    salary: string
  ): Promise<JobAttributes> {
    const prompt = `Analyze this academic job posting and extract key attributes. Return ONLY a valid JSON object with the following structure:

{
  "category": "string or null - Academic discipline category (e.g., Physics, Computer Science, Biology)",
  "workModality": "string or null - On-site, Remote, Hybrid, or null if unclear",
  "contractType": "string or null - Full-time, Part-time, Temporary, Permanent, or null if unclear",
  "durationMonths": "number or null - Duration in months if temporary/fixed-term, null if permanent",
  "renewable": "boolean or null - Whether the position is renewable, null if unclear",
  "fundingSource": "string or null - Source of funding (e.g., Grant, University, Government, Industry)",
  "visaSponsorship": "boolean or null - Whether visa sponsorship is available, null if unclear",
  "interviewProcess": "string or null - Brief description of interview process if mentioned",
  "confidence": "number between 0 and 1 - Confidence in the extraction"
}

Job Title: ${title}
Salary: ${salary}
Description: ${description.substring(0, 2000)}...

Return only the JSON object, no other text.`;

    try {
      const response = await this.callCohere(prompt);

      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        category: parsed.category || null,
        workModality: parsed.workModality || null,
        contractType: parsed.contractType || null,
        durationMonths: parsed.durationMonths || null,
        renewable: parsed.renewable || null,
        fundingSource: parsed.fundingSource || null,
        visaSponsorship: parsed.visaSponsorship || null,
        interviewProcess: parsed.interviewProcess || null,
        confidence: parsed.confidence || 0,
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

  async extractApplicationRequirements(
    description: string
  ): Promise<ApplicationRequirements> {
    const prompt = `Analyze this job description and extract application requirements. Return ONLY a valid JSON object with the following structure:

{
  "documentTypes": ["array of strings - Required documents (e.g., CV, Cover Letter, Research Statement)"],
  "referenceLettersRequired": "number or null - Number of reference letters required",
  "platform": "string or null - Application platform if mentioned (e.g., AcademicJobsOnline, Interfolio)",
  "confidence": "number between 0 and 1 - Confidence in the extraction"
}

Description: ${description.substring(0, 2000)}...

Return only the JSON object, no other text.`;

    try {
      const response = await this.callCohere(prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        documentTypes: parsed.documentTypes || [],
        referenceLettersRequired: parsed.referenceLettersRequired || null,
        platform: parsed.platform || null,
        confidence: parsed.confidence || 0,
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

  async extractLanguageRequirements(
    description: string
  ): Promise<LanguageRequirements> {
    const prompt = `Analyze this job description and extract language requirements. Return ONLY a valid JSON object with the following structure:

{
  "languages": ["array of strings - Required languages (e.g., English, Spanish, French)"],
  "confidence": "number between 0 and 1 - Confidence in the extraction"
}

Description: ${description.substring(0, 2000)}...

Return only the JSON object, no other text.`;

    try {
      const response = await this.callCohere(prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        languages: parsed.languages || [],
        confidence: parsed.confidence || 0,
      };
    } catch (error) {
      console.error("Error extracting language requirements:", error);
      return {
        languages: [],
        confidence: 0,
      };
    }
  }

  async extractSuitableBackgrounds(
    description: string
  ): Promise<SuitableBackgrounds> {
    const prompt = `Analyze this job description and extract suitable academic backgrounds. Return ONLY a valid JSON object with the following structure:

{
  "backgrounds": ["array of strings - Suitable academic backgrounds (e.g., PhD in Physics, Master's in Computer Science)"],
  "confidence": "number between 0 and 1 - Confidence in the extraction"
}

Description: ${description.substring(0, 2000)}...

Return only the JSON object, no other text.`;

    try {
      const response = await this.callCohere(prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        backgrounds: parsed.backgrounds || [],
        confidence: parsed.confidence || 0,
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
