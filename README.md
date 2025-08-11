# Academic Job Board

A modern academic job board with intelligent job processing and enrichment capabilities.

## 🚀 Quick Start

### **Option 1: Full Two-Phase Process (Recommended for Production)**

```bash
# Phase 1: Extract, Transform, Load (Deterministic only)
# Phase 2: Sequential LLM Enrichment
npm run sync-sequential
```

### **Option 2: Batch-by-Batch ETL (Recommended for Development/Testing)**

```bash
# Process jobs in small batches with immediate database saves
# Each batch: Extract → Transform (with LLM) → Save to DB → Next batch
npm run batch-etl
```

### **Option 3: Enrichment Only**

```bash
# Run only the LLM enrichment phase on existing jobs
npm run enrich-only
```

## 🔧 Configuration

The scripts have sensible defaults built-in:

- **Extraction**: Always fetches ALL available jobs from API
- **Transformation**: Applies deterministic rules (dates, salaries, locations, etc.)
- **Loading**: Saves jobs to database immediately
- **Enrichment**: Processes 50 jobs per run with 1-second delays between jobs
- **Error Handling**: Continues processing even if individual jobs fail
- **Model**: Standardized on llama3.2:3b for consistent performance

If you need to customize these settings, you can modify the script files directly.

## 📦 Batch ETL Approach

The **batch ETL approach** is perfect for development and testing because it:

1. **Processes jobs in small batches** (default: 5 jobs per batch)
2. **Saves each batch immediately** to the database
3. **Shows progress in real-time** - you see results after each batch
4. **Includes LLM enrichment** for each batch (if enabled)
5. **Continues on errors** - one failed batch doesn't stop the process

### **Batch ETL Configuration:**

```typescript
// In batch-etl.ts
const result = await runBatchETL({
  pageSize: 5, // Jobs per batch
  maxPages: 3, // Maximum pages to process
  devBreakAfter: 2, // Stop after N batches for testing
  enableLLMEnrichment: true, // Enable LLM enrichment per batch
  continueOnError: true, // Continue on individual batch failures
  dryRun: false, // Actually save to database
});
```

### **Batch ETL Flow:**

```
Batch 1: Extract 5 jobs → Transform (with LLM) → Save to DB ✅
Batch 2: Extract 5 jobs → Transform (with LLM) → Save to DB ✅
Batch 3: Extract 5 jobs → Transform (with LLM) → Save to DB ✅
...
```

### **Benefits:**

- ✅ **Immediate results** - see database records after each batch
- ✅ **Faster feedback** - no waiting for all 500+ jobs to complete
- ✅ **Better error handling** - individual batch failures don't stop everything
- ✅ **Progress monitoring** - clear visibility into what's happening
- ✅ **Development friendly** - process small batches for testing

## 📝 Prompt Optimization

All LLM prompts have been optimized for `llama3.2:3b` using industry best practices:

- **JSON Schema First**: Expected output structure shown immediately
- **Strong JSON Enforcement**: "Return ONLY a valid JSON object"
- **Consistent Structure**: Same format across all extraction tasks
- **Minimal Instructions**: Reduced cognitive load for better accuracy
- **Standardized Confidence**: 0.0-1.0 scale across all extractions

See `src/job-sync-etl/PROMPT_IMPROVEMENTS.md` for detailed documentation.

## 🏗️ Architecture

- **`job-orchestrator.ts`** - Main orchestration logic
- **`sync-sequential.ts`** - Full sync + enrichment script
- **`enrich-only.ts`** - Enrichment only script
- **`sequential-enrichment.ts`** - LLM enrichment logic
- **`job-queue.ts`** - Job queue management

## 🔧 Key Features

- **Scalable**: Handles thousands of jobs reliably
- **Fault-tolerant**: Individual failures don't stop the process
- **Resource-efficient**: No wasted API calls on failed batches
- **Monitoring**: Built-in progress tracking and error handling
- **Flexible**: Can run phases independently
- **Optimized**: Standardized on llama3.2:3b for consistent performance

## 🎯 Benefits

- **Faster Initial Sync**: Jobs saved immediately without LLM delays
- **Better Reliability**: Failed enrichments don't block other jobs
- **Easier Maintenance**: Simple scripts, no complex CLI
- **Production Ready**: Robust error handling and retry logic
- **Consistent Performance**: Single model eliminates fallback complexity
