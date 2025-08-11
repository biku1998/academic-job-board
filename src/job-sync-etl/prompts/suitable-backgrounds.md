# Suitable Backgrounds Extraction

Extract suitable academic backgrounds from this job description.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "backgrounds": ["string", "string"],
  "confidence": 0.85
}
```

## Field Requirements

- **backgrounds**: Array of suitable academic backgrounds (e.g., ["PhD in Computer Science", "PhD in Mathematics"])
- **confidence**: Number between 0.0 and 1.0

## Background Types

- **Degree Levels**: PhD, Master's, Bachelor's, Postdoctoral
- **Core Disciplines**: Physics, Chemistry, Biology, Mathematics, Computer Science
- **Interdisciplinary**: Bioinformatics, Computational Biology, Materials Science
- **Applied Fields**: Engineering, Applied Mathematics, Data Science

## Common Indicators

- "PhD in [field] required"
- "Candidates with background in [field] preferred"
- "Experience in [research area]"
- "Training in [methodology]"
- "Specialization in [subfield]"

## Rules

- Return empty array if no specific requirements
- Use specific academic terms
- Include interdisciplinary backgrounds if mentioned
- No explanation text - JSON only
- If uncertain, use lower confidence score
