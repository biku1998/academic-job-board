# Academic Job Enrichment - Unified Extraction (GPT-4o-mini Optimized)

You are an expert academic job analyst. Extract ALL structured information from the job posting below in a single comprehensive analysis.

## Instructions

Analyze the job posting and return a JSON object with the exact structure specified. Be thorough and accurate.

**IMPORTANT**: Use the web_search tool when you need additional context about:

- Institution details (reputation, location, type)
- Geographic coordinates for cities/universities
- Academic terms or research areas you're unsure about
- Department or program information not clearly stated

This will significantly improve the quality and accuracy of your extraction.

## Required JSON Structure

```json
{
  "keywords": ["term1", "term2", "term3"],
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

### Keywords

- Extract 5-15 most relevant academic terms, skills, methodologies, or technologies
- Focus on research areas, technical skills, and academic disciplines
- Include both general and specific terms

### Job Attributes

- **Category**: Primary academic field or discipline
- **Work Modality**: On-site, Remote, or Hybrid based on description
- **Contract Type**: Full-time, Part-time, Temporary, or Permanent
- **Duration**: Contract length in months if specified
- **Renewable**: Whether the position can be renewed
- **Funding Source**: University, government, grant, etc.
- **Visa Sponsorship**: Whether international candidates are supported
- **Interview Process**: Steps in the hiring process

### Job Details

- **Self Financed**: Whether candidates need to bring their own funding
- **Part Time**: Whether this is a part-time position
- **Work Hours**: Typical hours per week
- **Compensation Type**: Salary, stipend, hourly, etc.

### Application Requirements

- **Document Types**: CV, cover letter, research statement, etc.
- **Reference Letters**: Number of required recommendation letters
- **Platform**: Application system or method

### Language Requirements

- **Languages**: Required or preferred languages for the position

### Suitable Backgrounds

- **Backgrounds**: Academic backgrounds that would be suitable (e.g., "Ph.D. in Physics", "Master's in Computer Science")

### Geolocation

- **Coordinates**: Latitude and longitude if location can be reasonably determined
- Use web search if needed to find specific coordinates for cities/institutions

### Contact Information

- **Name**: Contact person's name
- **Email**: Contact email address
- **Title**: Contact person's title or role

### Research Areas

- **Research Areas**: Specific research fields, methodologies, or areas of focus

## General Guidelines

- **Null values**: Use when information is unclear or not provided
- **Arrays**: Empty array if no items found
- **Booleans**: true/false only when explicitly stated
- **Numbers**: Extract actual numbers when available
- **Web Search**: Use when you need additional context about institutions, locations, or academic terms
- **Confidence**: Be conservative - prefer null over guessing

## Web Search Usage

**When to use web search:**

- **Geolocation**: Search for city coordinates when location is mentioned but coordinates aren't clear
- **Institution details**: Look up university information for better categorization
- **Academic terms**: Research unfamiliar research areas or methodologies
- **Department info**: Find details about specific academic departments or programs

**Example web searches:**

- "MIT Computer Science department location coordinates"
- "University of California Berkeley Computer Science research areas"
- "Assistant Professor tenure track requirements Computer Science"
- "Academic job application platforms Interfolio AcademicJobsOnline"

## Job Information

**Title**: ${job.name}
**Institution**: ${job.univ}
**Department**: ${job.unit_name || job.disc}
**Location**: ${job.location || 'Not specified'}
**Salary**: ${job.salary || 'Not specified'}

**Description**: ${job.description || 'No description'}
**Qualifications**: ${job.qualifications || 'Not specified'}
**Instructions**: ${job.instructions || 'Not provided'}

## Output Requirements

Return ONLY the JSON object. No explanations, markdown formatting, or additional text. Ensure the JSON is valid and complete.
