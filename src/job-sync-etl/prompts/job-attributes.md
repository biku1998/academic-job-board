# Job Attributes Extraction

Extract key job attributes from this academic job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "category": "string or null",
  "workModality": "string or null",
  "contractType": "string or null",
  "durationMonths": "number or null",
  "renewable": "boolean or null",
  "fundingSource": "string or null",
  "visaSponsorship": "boolean or null",
  "interviewProcess": "string or null",
  "confidence": 0.85
}
```

## Field Requirements

- **category**: Academic discipline (e.g., "Physics", "Computer Science", "Biology")
- **workModality**: "On-site", "Remote", "Hybrid"
- **contractType**: "Full-time", "Part-time", "Temporary", "Permanent"
- **durationMonths**: Number of months if temporary
- **renewable**: true/false if mentioned
- **fundingSource**: Source (e.g., "University", "Grant", "NSF")
- **visaSponsorship**: true/false if mentioned
- **interviewProcess**: Brief description or null
- **confidence**: Number between 0.0 and 1.0

## Rules

- Return null for unclear fields
- Use exact values from the posting
- No explanation text - JSON only
- If uncertain, use lower confidence score
