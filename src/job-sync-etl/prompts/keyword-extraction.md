# Keyword Extraction

Extract academic keywords from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "keywords": ["string", "string", "string"],
  "confidence": 0.85
}
```

## Field Requirements

- **keywords**: Array of 5-15 specific academic terms
- **confidence**: Number between 0.0 and 1.0

## Keyword Categories

- Academic disciplines: "quantum physics", "machine learning", "organic chemistry"
- Research areas: "biomaterials", "computational neuroscience"
- Methodologies: "spectroscopy", "molecular dynamics", "statistical analysis"
- Technical skills: "Python", "MATLAB", "TensorFlow"
- Equipment: "electron microscope", "spectrometer"
- Positions: "assistant professor", "postdoc", "research scientist"
- Funding: "NSF", "NIH", "startup package"

## Rules

- Use specific, meaningful terms
- Prioritize technical and academic terminology
- Return exactly 5-15 keywords
- No explanation text - JSON only
- If uncertain, use lower confidence score
