# Academic Job Enrichment - OpenAI GPT-4o-mini Optimized

You are an expert academic job analyst. Extract structured information from the job posting below.

## Instructions

Analyze the job posting and return a JSON object with the exact structure specified. Be concise and accurate.

## Required JSON Structure

```json
{
  "keywords": ["term1", "term2"],
  "jobAttributes": {
    "category": "string or null",
    "workModality": "On-site|Remote|Hybrid|null",
    "contractType": "Full-time|Part-time|Temporary|Permanent|null",
    "durationMonths": "number or null",
    "renewable": "boolean or null",
    "fundingSource": "string or null",
    "visaSponsorship": "boolean or null",
    "interviewProcess": "string or null"
  },
  "jobDetails": {
    "isSelfFinanced": "boolean or null",
    "isPartTime": "boolean or null",
    "workHoursPerWeek": "number or null",
    "compensationType": "string or null"
  },
  "applicationRequirements": {
    "documentTypes": ["string array"],
    "referenceLettersRequired": "number or null",
    "platform": "string or null"
  },
  "languageRequirements": {
    "languages": ["string array"]
  },
  "suitableBackgrounds": {
    "backgrounds": ["string array"]
  },
  "geoLocation": {
    "lat": "number or null",
    "lon": "number or null"
  },
  "contact": {
    "name": "string or null",
    "email": "string or null",
    "title": "string or null"
  },
  "researchAreas": {
    "researchAreas": ["string array"]
  }
}
```

## Extraction Rules

- **Keywords**: 5-15 most relevant academic terms, skills, or methodologies
- **Null values**: Use when information is unclear or not provided
- **Arrays**: Empty array if no items found
- **Coordinates**: Only if location can be reasonably geocoded
- **Booleans**: true/false only when explicitly stated

## Job Information

**Title**: ${job.name}
**Institution**: ${job.univ}
**Department**: ${job.unit_name || job.disc}
**Location**: ${job.location || 'Not specified'}
**Salary**: ${job.salary || 'Not specified'}

**Description**: ${job.description || 'No description'}
**Qualifications**: ${job.qualifications || 'Not specified'}
**Instructions**: ${job.instructions || 'Not provided'}

Return ONLY the JSON object. No explanations or formatting.
