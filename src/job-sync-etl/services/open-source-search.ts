import axios from "axios";

export interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  source: "duckduckgo" | "google" | "scraping" | "searxng";
  query: string;
}

export class OpenSourceSearchService {
  private searxngUrl?: string;

  constructor(searxngUrl?: string) {
    this.searxngUrl = searxngUrl; // Optional SearXNG instance
  }

  /**
   * Main search method that tries multiple sources
   */
  async search(query: string, maxResults: number = 3): Promise<SearchResponse> {
    console.log(`🔍 Searching for: "${query}"`);

    // Try DuckDuckGo Instant Answer first (best for factual queries)
    try {
      const duckResults = await this.searchDuckDuckGo(query, maxResults);
      if (duckResults.results.length > 0) {
        console.log(
          `✅ DuckDuckGo returned ${duckResults.results.length} results`
        );
        return duckResults;
      }
    } catch (error) {
      console.warn("DuckDuckGo search failed:", error);
    }

    // Fallback to direct web scraping for specific queries
    try {
      const scrapingResults = await this.searchWithScraping(query, maxResults);
      if (scrapingResults.results.length > 0) {
        console.log(
          `✅ Web scraping returned ${scrapingResults.results.length} results`
        );
        return scrapingResults;
      }
    } catch (error) {
      console.warn("Web scraping search failed:", error);
    }

    // Fallback to SearXNG if available
    if (this.searxngUrl) {
      try {
        const searxResults = await this.searchSearXNG(query, maxResults);
        if (searxResults.results.length > 0) {
          console.log(
            `✅ SearXNG returned ${searxResults.results.length} results`
          );
          return searxResults;
        }
      } catch (error) {
        console.warn("SearXNG search failed:", error);
      }
    }

    console.warn(`⚠️  No search results found for: "${query}"`);
    return { results: [], source: "duckduckgo", query };
  }

  /**
   * DuckDuckGo Instant Answer API (Free, no API key required)
   */
  private async searchDuckDuckGo(
    query: string,
    maxResults: number
  ): Promise<SearchResponse> {
    try {
      // DuckDuckGo Instant Answer API
      const instantResponse = await axios.get(`https://api.duckduckgo.com/`, {
        params: {
          q: query,
          format: "json",
          no_html: 1,
          skip_disambig: 1,
        },
        timeout: 10000,
      });

      const results: SearchResult[] = [];

      // Extract abstract (main answer)
      if (instantResponse.data.Abstract) {
        results.push({
          title: instantResponse.data.Heading || query,
          snippet: instantResponse.data.Abstract,
          url: instantResponse.data.AbstractURL,
        });
      }

      // Extract related topics
      if (instantResponse.data.RelatedTopics) {
        for (const topic of instantResponse.data.RelatedTopics.slice(
          0,
          maxResults - results.length
        )) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Result
                ? topic.Result.split(" - ")[0]
                : topic.Text.split(".")[0],
              snippet: topic.Text,
              url: topic.FirstURL,
            });
          }
        }
      }

      // Extract definition if available
      if (instantResponse.data.Definition && results.length === 0) {
        results.push({
          title: `Definition: ${query}`,
          snippet: instantResponse.data.Definition,
          url: instantResponse.data.DefinitionURL,
        });
      }

      return {
        results: results.slice(0, maxResults),
        source: "duckduckgo",
        query,
      };
    } catch (error) {
      console.warn("DuckDuckGo API error:", error);
      throw error;
    }
  }

  /**
   * Direct web scraping for specific domains (for academic/university info)
   */
  private async searchWithScraping(
    query: string,
    maxResults: number
  ): Promise<SearchResponse> {
    const results: SearchResult[] = [];

    // For university/academic queries, try specific strategies
    if (this.isAcademicQuery(query)) {
      try {
        const academicResults = await this.searchAcademicSources(
          query,
          maxResults
        );
        results.push(...academicResults);
      } catch (error) {
        console.warn("Academic search failed:", error);
      }
    }

    // For location queries, try specific geocoding
    if (this.isLocationQuery(query)) {
      try {
        const locationResults = await this.searchLocationInfo(
          query,
          maxResults
        );
        results.push(...locationResults);
      } catch (error) {
        console.warn("Location search failed:", error);
      }
    }

    return { results: results.slice(0, maxResults), source: "scraping", query };
  }

  /**
   * Search academic sources for university/research information
   */
  private async searchAcademicSources(
    query: string,
    maxResults: number
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // Try searching academic databases or university websites
    // This is a simplified example - you can expand based on your needs
    try {
      // Example: Search for university information
      if (
        query.toLowerCase().includes("university") ||
        query.toLowerCase().includes("college")
      ) {
        const universityInfo = await this.getUniversityInfo(query);
        if (universityInfo) {
          results.push(universityInfo);
        }
      }
    } catch (error) {
      console.warn("Academic source search error:", error);
    }

    return results.slice(0, maxResults);
  }

  /**
   * Search for location/geographic information
   */
  private async searchLocationInfo(
    query: string,
    maxResults: number
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: query,
            format: "json",
            limit: maxResults,
            addressdetails: 1,
          },
          headers: {
            "User-Agent": "AcademicJobBoard/1.0", // Required by Nominatim
          },
          timeout: 10000,
        }
      );

      for (const place of response.data) {
        results.push({
          title: place.display_name,
          snippet: `Location: ${place.display_name}. Coordinates: ${place.lat}, ${place.lon}. Type: ${place.type}`,
          url: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}`,
        });
      }
    } catch (error) {
      console.warn("Location search error:", error);
    }

    return results;
  }

  /**
   * SearXNG search (if self-hosted instance is available)
   */
  private async searchSearXNG(
    query: string,
    maxResults: number
  ): Promise<SearchResponse> {
    if (!this.searxngUrl) {
      throw new Error("SearXNG URL not configured");
    }

    try {
      const response = await axios.get(`${this.searxngUrl}/search`, {
        params: {
          q: query,
          format: "json",
          categories: "general",
        },
        timeout: 15000,
      });

      const results: SearchResult[] = response.data.results
        .slice(0, maxResults)
        .map((result: { title: string; content?: string; url: string }) => ({
          title: result.title,
          snippet: result.content || result.title,
          url: result.url,
        }));

      return { results, source: "searxng", query };
    } catch (error) {
      console.warn("SearXNG search error:", error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private isAcademicQuery(query: string): boolean {
    const academicKeywords = [
      "university",
      "college",
      "research",
      "department",
      "faculty",
      "professor",
      "phd",
      "doctorate",
      "academic",
      "institute",
    ];
    const lowerQuery = query.toLowerCase();
    return academicKeywords.some((keyword) => lowerQuery.includes(keyword));
  }

  private isLocationQuery(query: string): boolean {
    const locationKeywords = [
      "coordinates",
      "latitude",
      "longitude",
      "location",
      "address",
      "city",
      "country",
      "state",
      "province",
    ];
    const lowerQuery = query.toLowerCase();
    return locationKeywords.some((keyword) => lowerQuery.includes(keyword));
  }

  private async getUniversityInfo(query: string): Promise<SearchResult | null> {
    // Simplified university info extraction
    // In a real implementation, you might search specific academic databases
    try {
      const universityName = query.replace(/university|college/gi, "").trim();
      return {
        title: `${universityName} University Information`,
        snippet: `Academic institution information for ${universityName}. This is a placeholder for university-specific data that could be gathered from academic databases.`,
      };
    } catch {
      return null;
    }
  }

  private extractLocationFromQuery(query: string): string {
    // Remove search-specific terms to get clean location
    return query
      .replace(/coordinates?|latitude|longitude|location|address/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Format results for LLM consumption (similar to Tavily format)
   */
  formatForLLM(searchResponse: SearchResponse): string {
    if (searchResponse.results.length === 0) {
      return `No search results found for query: "${searchResponse.query}"`;
    }

    return searchResponse.results
      .map(
        (result, index) =>
          `Result ${index + 1}: ${result.title}\n${result.snippet}${
            result.url ? `\nSource: ${result.url}` : ""
          }`
      )
      .join("\n\n");
  }
}
