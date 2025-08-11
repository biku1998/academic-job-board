# Research Areas Extraction

Extract specific research areas and specializations from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "researchAreas": ["string", "string"],
  "confidence": 0.85
}
```

## Field Requirements

- **researchAreas**: Array of specific research areas (e.g., ["Machine Learning", "Quantum Computing"])
- **confidence**: Number between 0.0 and 1.0

## Research Categories

- **AI/ML**: "Machine Learning", "Artificial Intelligence", "Deep Learning", "Neural Networks"
- **Computing**: "Quantum Computing", "High Performance Computing", "Distributed Systems"
- **Sciences**: "Climate Science", "Biomedical Engineering", "Materials Science"
- **Social**: "Social Psychology", "Cognitive Science", "Behavioral Economics"
- **Humanities**: "Medieval Literature", "Digital Humanities", "Comparative Literature"

## Rules

- Return empty array if no specific areas mentioned
- Use specific academic terms
- Include both broad areas and specializations
- No explanation text - JSON only
- If uncertain, use lower confidence score
