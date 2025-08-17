import { config } from "@/config";
import type { LLMEnrichmentService } from "./llm-enrichment.interface";
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
      this.preferredService = "unified";
      console.log("✅ Unified OpenAI service registered (cost-optimized)");
    } else {
      console.log(
        "⚠️  No OpenAI API key found, unified enrichment service unavailable"
      );
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
    if (serviceName === "unified" && this.services.has("unified")) {
      this.preferredService = serviceName;
      console.log(`🎯 Switched preferred LLM service to: ${serviceName}`);
      return true;
    }
    console.warn(`⚠️  Service '${serviceName}' not found or not available`);
    return false;
  }

  /**
   * Get the best available service based on priority
   */
  getBestAvailableService(): LLMEnrichmentService | null {
    // Only unified service is available now
    const service = this.services.get("unified");
    return service && service.isAvailable() ? service : null;
  }
}
