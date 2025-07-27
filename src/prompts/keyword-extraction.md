# Keyword Extraction Prompt

Extract relevant academic keywords from this job posting. Focus on:

## Academic Disciplines & Subfields

- Specific fields (e.g., "quantum physics", "machine learning", "organic chemistry")
- Research areas (e.g., "biomaterials", "computational neuroscience")
- Specializations (e.g., "theoretical physics", "experimental biology")

## Research Methodologies

- Experimental techniques (e.g., "spectroscopy", "microscopy", "PCR")
- Computational methods (e.g., "molecular dynamics", "finite element analysis")
- Analytical approaches (e.g., "statistical analysis", "data mining")

## Technical Skills & Tools

- Programming languages (e.g., "Python", "MATLAB", "R")
- Software platforms (e.g., "TensorFlow", "AutoCAD", "SPSS")
- Laboratory equipment (e.g., "electron microscope", "spectrometer")

## Academic Positions & Ranks

- Faculty positions (e.g., "assistant professor", "lecturer", "research scientist")
- Postdoctoral roles (e.g., "postdoc", "research fellow")
- Administrative roles (e.g., "department chair", "director")

## Funding & Grant Types

- Grant sources (e.g., "NSF", "NIH", "NSERC")
- Funding mechanisms (e.g., "startup package", "research grant")

## Requirements

- Return ONLY a valid JSON object with the following structure:
- Include 5-15 most relevant keywords
- Use specific, meaningful terms rather than generic words
- Prioritize technical and academic terminology
- No explanation or additional text

## Output Format

Return a JSON object with this structure:

```json
{
  "keywords": ["array of keyword strings"],
  "confidence": "number between 0 and 1"
}
```

Example output: `{"keywords": ["quantum physics", "theoretical physics", "quantum computing", "quantum algorithms", "quantum information"], "confidence": 0.85}`
