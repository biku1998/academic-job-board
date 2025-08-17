import { config } from "@/config";
import type { LLMEnrichmentService } from "./llm-enrichment.interface";
import { OpenAIEnrichmentService } from "./openai-enrichment";
import { CohereEnrichmentService } from "./cohere-enrichment";
import { UnifiedEnrichmentService } from "./unified-enrichment";

export class LLMServiceFactory {
  private static instance: LLMServiceFactory;
  private services: Map<string, LLMEnrichmentService> = new Map();
  private preferredService: string | null = null;

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): LLMServiceFactory {
    if (!LLMServiceFactory.instance) {
      LLMServiceFactory.instance = new LLMServiceFactory();
    }
    return LLMServiceFactory.instance;
  }

  private initializeServices(): void {
    // Initialize Unified OpenAI service (preferred for cost optimization)
    if (config.openAiApiKey) {
      const unifiedService = new UnifiedEnrichmentService();
      this.services.set("unified", unifiedService);
      console.log("✅ Unified OpenAI service registered (cost-optimized)");
    }

    // Initialize legacy OpenAI service (fallback)
    if (config.openAiApiKey) {
      const openaiService = new OpenAIEnrichmentService();
      this.services.set("openai", openaiService);
      console.log("✅ Legacy OpenAI service registered");
    }

    // Initialize Cohere service
    if (config.cohereApiKey) {
      const cohereService = new CohereEnrichmentService();
      this.services.set("cohere", cohereService);
      console.log("✅ Cohere service registered");
    }

    // Set preferred service (Unified OpenAI first, then legacy OpenAI, then Cohere)
    if (this.services.has("unified")) {
      this.preferredService = "unified";
    } else if (this.services.has("openai")) {
      this.preferredService = "openai";
    } else if (this.services.has("cohere")) {
      this.preferredService = "cohere";
    }

    console.log(
      `🎯 Preferred LLM service: ${
        this.preferredService || "None"
      } (unified service prioritized for cost optimization)`
    );
  }

  /**
   * Get the preferred LLM enrichment service
   */
  getPreferredService(): LLMEnrichmentService | null {
    if (!this.preferredService) {
      return null;
    }
    return this.services.get(this.preferredService) || null;
  }

  /**
   * Get a specific LLM enrichment service by name
   */
  getService(serviceName: string): LLMEnrichmentService | null {
    return this.services.get(serviceName) || null;
  }

  /**
   * Get all available services
   */
  getAvailableServices(): LLMEnrichmentService[] {
    return Array.from(this.services.values());
  }

  /**
   * Get service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if a specific service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service ? service.isAvailable() : false;
  }

  /**
   * Get service information for debugging/monitoring
   */
  getServiceInfo(): Array<{
    name: string;
    available: boolean;
    features: string[];
    serviceName: string;
  }> {
    return Array.from(this.services.entries()).map(([key, service]) => ({
      name: key,
      available: service.isAvailable(),
      features: service.getSupportedFeatures(),
      serviceName: service.getServiceName(),
    }));
  }

  /**
   * Switch preferred service (useful for testing or manual override)
   */
  setPreferredService(serviceName: string): boolean {
    if (this.services.has(serviceName)) {
      this.preferredService = serviceName;
      console.log(`🎯 Switched preferred LLM service to: ${serviceName}`);
      return true;
    }
    console.warn(`⚠️  Service '${serviceName}' not available`);
    return false;
  }

  /**
   * Get the best available service based on priority
   */
  getBestAvailableService(): LLMEnrichmentService | null {
    // Priority order: Unified OpenAI > Legacy OpenAI > Cohere
    const priorityOrder = ["unified", "openai", "cohere"];

    for (const serviceName of priorityOrder) {
      const service = this.services.get(serviceName);
      if (service && service.isAvailable()) {
        return service;
      }
    }

    return null;
  }
}
