# Suitable Backgrounds Extraction Prompt

Analyze this job description and extract suitable academic backgrounds. Return ONLY a valid JSON object with the following structure:

## Required Fields

### backgrounds

- **Type**: array of strings
- **Description**: Suitable academic backgrounds for the position
- **Examples**: ["PhD in Physics", "Master's in Computer Science", "PhD in Mathematics with focus on Applied Statistics"]

### confidence

- **Type**: number between 0 and 1
- **Description**: Confidence in the extraction
- **Examples**: 0.8, 0.6, 0.9

## Background Types to Look For

### Degree Levels

- **PhD**: Doctoral degrees in specific fields
- **Master's**: Graduate degrees in relevant disciplines
- **Bachelor's**: Undergraduate degrees (less common for faculty positions)
- **Postdoctoral**: Postdoctoral experience requirements

### Academic Disciplines

- **Core Disciplines**: Physics, Chemistry, Biology, Mathematics, Computer Science
- **Interdisciplinary**: Bioinformatics, Computational Biology, Materials Science
- **Applied Fields**: Engineering, Applied Mathematics, Data Science

### Specializations

- **Research Areas**: Specific research focus areas
- **Methodologies**: Experimental, theoretical, computational approaches
- **Techniques**: Specific laboratory or computational techniques

## Common Background Indicators

- "PhD in [field] required"
- "Candidates with background in [field] preferred"
- "Experience in [research area]"
- "Training in [methodology]"
- "Specialization in [subfield]"

## Output Format

Return only the JSON object, no other text or explanation.

Example:

```json
{
  "backgrounds": [
    "PhD in Computer Science",
    "PhD in Mathematics with focus on Machine Learning",
    "PhD in Statistics with computational experience"
  ],
  "confidence": 0.9
}
```

Note: Focus on the most relevant and specific backgrounds mentioned in the job description.
