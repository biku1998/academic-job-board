# Contact Information Extraction

Extract contact person information from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "name": "string or null",
  "email": "string or null",
  "title": "string or null",
  "confidence": 0.85
}
```

## Field Requirements

- **name**: Full name of contact person (e.g., "Dr. John Smith", "Professor Jane Doe")
- **email**: Complete email address
- **title**: Position or role (e.g., "Department Chair", "Search Committee Chair", "HR Director")
- **confidence**: Number between 0.0 and 1.0

## Common Titles

- **Academic**: "Department Chair", "Professor", "Dean", "Director"
- **Administrative**: "HR Director", "Search Committee Chair", "Recruitment Officer"

## Rules

- Return null for unclear fields
- Use full names when available
- Extract complete email addresses
- No explanation text - JSON only
- If uncertain, use lower confidence score
