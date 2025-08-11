# Geolocation Extraction

Extract geographical coordinates from this job posting.

## Output Format

Return ONLY a valid JSON object with this exact structure:

```json
{
  "lat": "number or null",
  "lon": "number or null",
  "confidence": 0.85
}
```

## Field Requirements

- **lat**: Latitude coordinate in decimal degrees (e.g., 40.7128)
- **lon**: Longitude coordinate in decimal degrees (e.g., -74.0060)
- **confidence**: Number between 0.0 and 1.0

## Coordinate Format

- Use decimal degrees (not degrees/minutes/seconds)
- Positive for North/East, negative for South/West
- Focus on primary work location, not remote locations
- Return null if location unclear or remote position

## Rules

- Return null for unclear locations
- Use exact coordinates from location lookup
- No explanation text - JSON only
- If uncertain, use lower confidence score
