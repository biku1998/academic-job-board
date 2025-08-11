# Language Requirements Extraction

Extract language requirements from this job description.

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

## Language Types

- **Primary**: English, Spanish, French, German, Chinese, Japanese, Arabic
- **Regional**: Portuguese, Italian, Russian, Korean, Hindi
- **Research**: Languages needed for literature access or collaboration

## Common Indicators

- "Fluency in [language] required"
- "Proficiency in [language] preferred"
- "Ability to teach in [language]"
- "Research experience in [language]-speaking regions"

## Rules

- Return empty array if no specific requirements
- Use standard language names
- Include proficiency levels if specified
- No explanation text - JSON only
- If uncertain, use lower confidence score
