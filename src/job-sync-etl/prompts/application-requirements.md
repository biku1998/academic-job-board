# Application Requirements Extraction

Extract application requirements from this job description.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "documentTypes": ["string", "string"],
  "referenceLettersRequired": "number or null",
  "platform": "string or null",
  "confidence": 0.85
}
```

## Field Requirements

- **documentTypes**: Array of required documents (e.g., ["CV", "Cover Letter", "Research Statement"])
- **referenceLettersRequired**: Number of reference letters needed
- **platform**: Application platform (e.g., "AcademicJobsOnline", "Interfolio", "University Portal")
- **confidence**: Number between 0.0 and 1.0

## Common Values

- **Documents**: "CV", "Cover Letter", "Research Statement", "Teaching Statement", "Publication List", "Transcripts"
- **Platforms**: "AcademicJobsOnline", "Interfolio", "University Portal", "Email Application", "Online Form"

## Rules

- Return empty array for documentTypes if none specified
- Return null for unclear fields
- No explanation text - JSON only
- If uncertain, use lower confidence score
