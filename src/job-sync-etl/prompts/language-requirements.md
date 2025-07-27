# Language Requirements Extraction Prompt

Analyze this job description and extract language requirements. Return ONLY a valid JSON object with the following structure:

## Required Fields

### languages

- **Type**: array of strings
- **Description**: Required languages for the position
- **Examples**: ["English", "Spanish", "French", "German", "Mandarin"]

### confidence

- **Type**: number between 0 and 1
- **Description**: Confidence in the extraction
- **Examples**: 0.8, 0.6, 0.9

## Language Requirements to Look For

- **Primary Language**: Usually English for most academic positions
- **Secondary Languages**: Additional languages required for research, teaching, or collaboration
- **Regional Languages**: Languages specific to the institution's location
- **Research Languages**: Languages needed for accessing research literature or collaborating with international teams

## Common Language Indicators

- "Fluency in [language] required"
- "Proficiency in [language] preferred"
- "Ability to teach in [language]"
- "Research experience in [language]-speaking regions"
- "International collaboration requiring [language]"

## Output Format

Return only the JSON object, no other text or explanation.

Example:

```json
{
  "languages": ["English", "Spanish"],
  "confidence": 0.85
}
```

Note: If no specific language requirements are mentioned, return an empty array for languages.
