# Job Attributes Extraction Prompt

Analyze this academic job posting and extract key attributes. Return ONLY a valid JSON object with the following structure:

## Required Fields

- **category**: Academic discipline (e.g., "Physics", "Computer Science", "Biology") or null
- **workModality**: "On-site", "Remote", "Hybrid", or null
- **contractType**: "Full-time", "Part-time", "Temporary", "Permanent", or null
- **durationMonths**: Number of months if temporary, null if permanent
- **renewable**: true/false if mentioned, null if unclear
- **fundingSource**: Source of funding (e.g., "University", "Grant", "NSF") or null
- **visaSponsorship**: true/false if mentioned, null if unclear
- **interviewProcess**: Brief description of interview process or null
- **confidence**: Number between 0 and 1

## Output Format

Return only the JSON object, no other text.

Example:

```json
{
  "category": "Computer Science",
  "workModality": "On-site",
  "contractType": "Full-time",
  "durationMonths": null,
  "renewable": null,
  "fundingSource": "University",
  "visaSponsorship": true,
  "interviewProcess": "Research presentation and teaching demonstration",
  "confidence": 0.85
}
```
