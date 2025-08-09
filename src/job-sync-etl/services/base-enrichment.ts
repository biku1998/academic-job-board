import { ZodType } from "zod";

export type BaseEnrichmentResponse<T> = {
  data: T | null;
  source: "description" | "web" | "none";
  confidence: number;
  error?: string;
};

export interface BaseEnrichmentService {
  enrich<T extends Record<string, unknown>>({
    prompt,
    inputText,
    schema,
    webSearchQuery,
    confidenceKey,
  }: {
    prompt: string;
    inputText: string;
    schema: ZodType<T>;
    webSearchQuery?: string;
    confidenceKey?: keyof T;
  }): Promise<BaseEnrichmentResponse<T>>;

  isHealthy?(): Promise<boolean>;
}
