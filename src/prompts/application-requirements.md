# Application Requirements Extraction Prompt

Analyze this job description and extract application requirements. Return ONLY a valid JSON object with the following structure:

## Required Fields

### documentTypes

- **Type**: array of strings
- **Description**: Required documents for application
- **Examples**: ["CV", "Cover Letter", "Research Statement", "Teaching Statement", "Publication List", "Transcripts"]

### referenceLettersRequired

- **Type**: number or null
- **Description**: Number of reference letters required
- **Examples**: 3, 2, null

### platform

- **Type**: string or null
- **Description**: Application platform if mentioned
- **Examples**: "AcademicJobsOnline", "Interfolio", "University Portal", null

### confidence

- **Type**: number between 0 and 1
- **Description**: Confidence in the extraction
- **Examples**: 0.8, 0.6, 0.9

## Common Document Types to Look For

- CV/Resume
- Cover Letter
- Research Statement
- Teaching Statement
- Publication List
- Graduate Transcripts
- Reference Letters
- Diversity Statement
- Portfolio
- Writing Sample

## Common Application Platforms

- AcademicJobsOnline
- Interfolio
- University Portal
- Email Application
- Online Form

## Output Format

Return only the JSON object, no other text or explanation.

Example:

```json
{
  "documentTypes": [
    "CV",
    "Cover Letter",
    "Research Statement",
    "Teaching Statement",
    "Three Letters of Recommendation"
  ],
  "referenceLettersRequired": 3,
  "platform": "AcademicJobsOnline",
  "confidence": 0.9
}
```
