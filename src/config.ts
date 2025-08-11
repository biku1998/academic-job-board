export const config = {
  jobSourceUrl: process.env.JOB_SOURCE_URL || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  cohereApiKey: process.env.COHERE_API_KEY || "",
  tavilyApiKey: process.env.TAVILY_API_KEY || "",
  ollamaUrl: process.env.OLLAMA_URL || "",
  gemmaApiKey: process.env.GEMMA_API_KEY || "",
};

export const ollamaModels = ["llama3.2:3b"];
