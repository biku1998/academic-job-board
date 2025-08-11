import "dotenv/config";
import { Ollama } from "ollama";
import { config } from "@/config";

interface ETLTask {
  name: string;
  prompt: string;
  expectedTokens: number;
}

interface PerformanceTest {
  model: string;
  task: string;
  responseTime: number;
  tokensPerSecond: number;
  success: boolean;
  error?: string;
}

interface BenchmarkResult {
  model: string;
  averageResponseTime: number;
  averageTokensPerSecond: number;
  successRate: number;
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  errors: string[];
}

class OllamaPerformanceTester {
  private ollama: Ollama;
  private testIterations: number;

  constructor() {
    this.ollama = new Ollama({
      host: config.ollamaUrl || "http://127.0.0.1:11434",
    });
    this.testIterations = 3; // Test each model 3 times per task (reduced for complexity)
  }

  /**
   * Real ETL enrichment tasks for performance testing
   */
  private getETLTasks(): ETLTask[] {
    return [
      {
        name: "Keyword Extraction",
        prompt: `Extract relevant academic keywords from this job posting. Focus on:

Academic Disciplines & Subfields
- Specific fields (e.g., "quantum physics", "machine learning", "organic chemistry")
- Research areas (e.g., "biomaterials", "computational neuroscience")
- Specializations (e.g., "theoretical physics", "experimental biology")

Research Methodologies
- Experimental techniques (e.g., "spectroscopy", "microscopy", "PCR")
- Computational methods (e.g., "molecular dynamics", "finite element analysis")
- Analytical approaches (e.g., "statistical analysis", "data mining")

Technical Skills & Tools
- Programming languages (e.g., "Python", "MATLAB", "R")
- Software platforms (e.g., "TensorFlow", "AutoCAD", "SPSS")
- Laboratory equipment (e.g., "electron microscope", "spectrometer")

Return ONLY a valid JSON object with this structure:
{"keywords": ["array of keyword strings"], "confidence": "number between 0 and 1"}

Job Content:
Assistant Professor in Quantum Computing and Machine Learning

The Department of Computer Science at Tech University seeks applications for a tenure-track Assistant Professor position in Quantum Computing and Machine Learning. The successful candidate will develop novel quantum algorithms for machine learning applications, collaborate with interdisciplinary research teams, and teach undergraduate and graduate courses in computer science.

Requirements: PhD in Computer Science, Physics, or related field. Strong background in quantum computing, machine learning, and programming (Python, Qiskit, TensorFlow). Experience with quantum simulators and quantum hardware preferred.`,
        expectedTokens: 150, // Expected response length
      },
      {
        name: "Job Attributes Extraction",
        prompt: `Analyze this academic job posting and extract key attributes. Return ONLY a valid JSON object with the following structure:

Required Fields:
- category: Academic discipline (e.g., "Physics", "Computer Science", "Biology") or null
- workModality: "On-site", "Remote", "Hybrid", or null
- contractType: "Full-time", "Part-time", "Temporary", "Permanent", or null
- durationMonths: Number of months if temporary, null if permanent
- renewable: true/false if mentioned, null if unclear
- fundingSource: Source of funding (e.g., "University", "Grant", "NSF") or null
- visaSponsorship: true/false if mentioned, null if unclear
- interviewProcess: Brief description of interview process or null
- confidence: Number between 0 and 1

Return only the JSON object, no other text.

Job Content:
Postdoctoral Research Fellow in Computational Biology

The Institute for Advanced Research invites applications for a Postdoctoral Research Fellow position in Computational Biology. This is a 2-year position with possibility of renewal based on performance and funding availability. The fellow will work on developing machine learning models for genomic data analysis, collaborating with experimental biologists, and publishing high-impact research.

The position is funded by an NIH grant and offers competitive salary with benefits. International candidates are welcome to apply. The interview process includes a research presentation and one-on-one meetings with faculty members.`,
        expectedTokens: 200, // Expected response length
      },
      {
        name: "Research Areas Extraction",
        prompt: `Extract research areas and specializations from this academic job posting. Focus on:

Research Domains
- Primary research areas (e.g., "quantum computing", "biomaterials", "climate science")
- Sub-specializations (e.g., "quantum algorithms", "tissue engineering", "atmospheric modeling")
- Interdisciplinary connections (e.g., "computational neuroscience", "quantum biology")

Methodological Approaches
- Experimental methods (e.g., "laboratory research", "field studies", "clinical trials")
- Computational approaches (e.g., "machine learning", "simulation", "data analysis")
- Theoretical frameworks (e.g., "mathematical modeling", "statistical analysis")

Return ONLY a valid JSON object with this structure:
{"researchAreas": ["array of research area strings"], "confidence": "number between 0 and 1"}

Job Content:
Senior Research Scientist in Climate Modeling and Machine Learning

The Climate Research Institute seeks a Senior Research Scientist to lead research in climate modeling using advanced machine learning techniques. The position involves developing predictive models for extreme weather events, analyzing large-scale climate datasets, and collaborating with international research teams.

The successful candidate will work on projects related to atmospheric dynamics, ocean-atmosphere interactions, and climate change impacts on ecosystems. Experience with climate models (CESM, ESM), machine learning frameworks (PyTorch, TensorFlow), and big data analysis is required.`,
        expectedTokens: 180, // Expected response length
      },
    ];
  }

  /**
   * Run comprehensive performance tests with real ETL tasks
   */
  async runPerformanceTests(): Promise<void> {
    console.log("🚀 Starting Ollama Performance Tests with Real ETL Tasks...");
    console.log(
      `🔗 Testing against: ${config.ollamaUrl || "http://127.0.0.1:11434"}`
    );
    console.log(`🔄 Iterations per model per task: ${this.testIterations}`);
    console.log("");

    try {
      // Get available models
      const models = await this.getAvailableModels();
      console.log(`📋 Found ${models.length} models: ${models.join(", ")}`);
      console.log("");

      // Get ETL tasks
      const tasks = this.getETLTasks();
      console.log(
        `📝 Testing ${tasks.length} ETL tasks: ${tasks
          .map((t) => t.name)
          .join(", ")}`
      );
      console.log("");

      // Test each model on each task
      const allResults: BenchmarkResult[] = [];

      for (const model of models) {
        console.log(`🧪 Testing model: ${model}`);
        const modelResults: PerformanceTest[] = [];

        for (const task of tasks) {
          console.log(`  📋 Task: ${task.name}`);

          for (let i = 0; i < this.testIterations; i++) {
            try {
              const test = await this.runSingleETLTest(model, task);
              modelResults.push(test);

              if (test.success) {
                console.log(
                  `    ✅ ${task.name} Test ${i + 1}: ${
                    test.responseTime
                  }ms, ${test.tokensPerSecond.toFixed(1)} tokens/s`
                );
              } else {
                console.log(
                  `    ❌ ${task.name} Test ${i + 1}: Failed - ${test.error}`
                );
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              console.log(
                `    ❌ ${task.name} Test ${i + 1}: Error - ${errorMsg}`
              );
            }

            // Small delay between tests
            if (i < this.testIterations - 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }

        // Calculate overall model performance
        const result = this.calculateModelPerformance(model, modelResults);
        allResults.push(result);

        console.log(
          `✅ ${model}: ${result.averageResponseTime.toFixed(
            2
          )}ms avg, ${result.successRate.toFixed(1)}% success rate`
        );
        console.log("");
      }

      // Generate performance report
      this.generateReport(allResults, tasks);
    } catch (error) {
      console.error("❌ Performance testing failed:", error);
    }
  }

  /**
   * Get available models from Ollama
   */
  private async getAvailableModels(): Promise<string[]> {
    try {
      // We're standardizing on llama3.2:3b, so just return that
      return ["llama3.2:3b"];
    } catch (error) {
      console.error("❌ Failed to get models:", error);
      return [];
    }
  }

  /**
   * Run a single ETL performance test
   */
  private async runSingleETLTest(
    model: string,
    task: ETLTask
  ): Promise<PerformanceTest> {
    const startTime = Date.now();

    try {
      const response = await this.ollama.chat({
        model,
        messages: [
          {
            role: "user",
            content: task.prompt,
          },
        ],
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 300, // Increased for complex ETL responses
          num_ctx: 4096, // Increased context for complex prompts
        },
        stream: false,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Calculate tokens per second (rough estimate)
      const responseText = response.message.content;
      const wordCount = responseText.split(/\s+/).length;
      const tokensPerSecond = (wordCount * 1.3) / (responseTime / 1000);

      return {
        model,
        task: task.name,
        responseTime,
        tokensPerSecond,
        success: true,
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        model,
        task: task.name,
        responseTime,
        tokensPerSecond: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Calculate overall performance for a model across all tasks
   */
  private calculateModelPerformance(
    model: string,
    tests: PerformanceTest[]
  ): BenchmarkResult {
    const successfulTests = tests.filter((t) => t.success);
    const successRate = (successfulTests.length / tests.length) * 100;

    const averageResponseTime =
      successfulTests.length > 0
        ? successfulTests.reduce((sum, t) => sum + t.responseTime, 0) /
          successfulTests.length
        : 0;

    const averageTokensPerSecond =
      successfulTests.length > 0
        ? successfulTests.reduce((sum, t) => sum + t.tokensPerSecond, 0) /
          successfulTests.length
        : 0;

    const errors = tests
      .filter((t) => !t.success)
      .map((t) => t.error || "Unknown error");

    return {
      model,
      averageResponseTime,
      averageTokensPerSecond,
      successRate,
      totalTests: tests.length,
      successfulTests: successfulTests.length,
      failedTests: tests.length - successfulTests.length,
      errors,
    };
  }

  /**
   * Generate performance report
   */
  private generateReport(results: BenchmarkResult[], tasks: ETLTask[]): void {
    console.log("📊 ETL PERFORMANCE REPORT");
    console.log("=".repeat(60));

    // Sort by average response time (fastest first)
    const sortedResults = [...results].sort(
      (a, b) => a.averageResponseTime - b.averageResponseTime
    );

    console.log("\n🏆 PERFORMANCE RANKING (by response time):");
    sortedResults.forEach((result, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      console.log(
        `${medal} ${result.model.padEnd(20)} | ${result.averageResponseTime
          .toFixed(0)
          .padStart(4)}ms | ${result.successRate
          .toFixed(1)
          .padStart(5)}% success | ${result.totalTests} tests`
      );
    });

    console.log("\n📈 DETAILED STATISTICS:");
    console.log("-".repeat(60));

    results.forEach((result) => {
      console.log(`\n🔹 ${result.model}:`);
      console.log(
        `   Response Time: ${result.averageResponseTime.toFixed(2)}ms average`
      );
      console.log(
        `   Throughput: ${result.averageTokensPerSecond.toFixed(
          1
        )} tokens/second`
      );
      console.log(
        `   Success Rate: ${result.successRate.toFixed(1)}% (${
          result.successfulTests
        }/${result.totalTests})`
      );

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length} failures`);
        result.errors.forEach((error) => console.log(`     - ${error}`));
      }
    });

    // Performance analysis
    console.log("\n🔍 PERFORMANCE ANALYSIS:");
    console.log("-".repeat(60));

    const fastestModel = sortedResults[0];
    const slowestModel = sortedResults[sortedResults.length - 1];

    if (fastestModel && slowestModel) {
      const speedDifference =
        slowestModel.averageResponseTime / fastestModel.averageResponseTime;
      console.log(
        `Fastest: ${
          fastestModel.model
        } (${fastestModel.averageResponseTime.toFixed(0)}ms)`
      );
      console.log(
        `Slowest: ${
          slowestModel.model
        } (${slowestModel.averageResponseTime.toFixed(0)}ms)`
      );
      console.log(`Speed difference: ${speedDifference.toFixed(1)}x slower`);

      if (speedDifference > 3) {
        console.log(
          "⚠️  WARNING: Significant performance variation between models"
        );
      }
    }

    // ETL-specific recommendations
    console.log("\n💡 ETL PERFORMANCE RECOMMENDATIONS:");
    console.log("-".repeat(60));

    if (fastestModel && fastestModel.averageResponseTime < 5000) {
      console.log("✅ Good ETL performance detected");
    } else if (fastestModel && fastestModel.averageResponseTime < 10000) {
      console.log("⚠️  Moderate ETL performance - consider optimization");
    } else {
      console.log(
        "❌ Poor ETL performance - investigate network/configuration issues"
      );
    }

    if (results.some((r) => r.successRate < 80)) {
      console.log(
        "⚠️  Some models have low success rates - check model availability"
      );
    }

    console.log("\n🎯 For ETL production use, consider:");
    console.log(
      "- Using the fastest performing model for real-time processing"
    );
    console.log(
      "- Implementing request queuing for high-volume job processing"
    );
    console.log("- Monitoring response times during actual ETL runs");
    console.log("- Adjusting batch sizes based on model performance");
    console.log(
      `- Current test complexity: ${tasks.length} tasks × ${
        this.testIterations
      } iterations = ${
        tasks.length * this.testIterations
      } total tests per model`
    );
  }
}

// Run the performance tests
async function main() {
  const tester = new OllamaPerformanceTester();
  await tester.runPerformanceTests();
}

main().catch(console.error);
