# Job Details Extraction

Extract employment conditions and compensation details from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "isSelfFinanced": "boolean or null",
  "isPartTime": "boolean or null",
  "workHoursPerWeek": "number or null",
  "compensationType": "string or null",
  "confidence": 0.85
}
```

## Field Requirements

- **isSelfFinanced**: true if candidate must bring funding, false if not, null if unclear
- **isPartTime**: true if part-time, false if full-time, null if unclear
- **workHoursPerWeek**: Number of hours (e.g., 40, 20, 35)
- **compensationType**: "salary", "stipend", "fellowship", "grant", "hourly", "contract"
- **confidence**: Number between 0.0 and 1.0

## Rules

- Return null for unclear fields
- Use exact values from the posting
- No explanation text - JSON only
- If uncertain, use lower confidence score
