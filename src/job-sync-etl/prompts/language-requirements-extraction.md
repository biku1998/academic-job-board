# Language Requirements Extraction

Extract language proficiency requirements from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "languages": ["string", "string"],
  "confidence": 0.85
}
```

## Field Requirements

- **languages**: Array of required languages (e.g., ["English", "Spanish"])
- **confidence**: Number between 0.0 and 1.0

## Common Languages

- **Primary**: English, Spanish, French, German, Chinese, Japanese, Arabic
- **Regional**: Portuguese, Italian, Russian, Korean, Hindi

## Rules

- Return empty array if no language requirements
- Use standard language names
- Include proficiency levels if specified (e.g., "fluent", "native")
- No explanation text - JSON only
- If uncertain, use lower confidence score
