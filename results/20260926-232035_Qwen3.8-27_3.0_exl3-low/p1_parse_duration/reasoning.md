Let me break down the requirements:

1. Parse a duration string into total seconds
2. Parts are `<non-negative integer><unit>` with no space between number and unit
3. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
4. Units must appear in order: d, h, m, s. Each at most once. Any subset allowed.
5. Parts can be together ("1h30m") or separated by one or more spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. Each part must match pattern: digits followed by a single unit character
5. Validate units are in correct order and not repeated
6. Sum up the seconds

Let me think about edge cases:
- "  1h 30m  " → strip → "1h 30m" → split → ["1h", "30m"] → valid
- "1h30m" → split by spaces → ["1h30m"] → need to parse this as one token with multiple parts
- Wait, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces"

So "1h30m" is a single "part" written together. I need to handle both cases.

Better approach: After stripping, use regex to find all valid parts (digits + unit), then verify:
- The entire string (after stripping) is composed of only these parts and spaces between them
- Units are in correct order
- No repeated units

Let me use a regex approach:
- Strip the string
- If empty, raise ValueError
- Use regex to find all matches of `\d+[dhms]`
- Verify that the original string (stripped) consists only of these matches separated by spaces
- Check order and uniqueness of units

Actually, let me think more carefully. The string after stripping should be:
- One or more "tokens" separated by one or more spaces
- Each token is one or more "parts" written together
- Each part is `\d+[dhms]`

So a token like "1h30m" is valid - it's two parts together.

Let me use a regex to match the entire string:
- Pattern: `(\d+[dhms])((?:\s+\d+[dhms])*|\s*)` - hmm this is getting complex.

Better approach:
1. Strip the string
2. If empty, raise ValueError
3. Split by one or more spaces: `re.split(r'\s+', stripped)`
4. For each token, use regex to find all parts: `re.findall(r'\d+[dhms]', token)`
5. Verify that the token is exactly composed of these parts (no extra characters): `re.fullmatch(r'(?:\d+[dhms])+', token)`
6. Collect all parts in order
7. Check that units are in correct order (d < h < m < s) and no repeats
8. Sum up

Wait, I need to be more careful. Let me think about what constitutes a valid token:
- A token is one or more `<digits><unit>` written together
- So "1h30m" is valid, "1h30" is not (30 has no unit), "1h.5m" is not (decimal)

Let me use `re.fullmatch(r'(?:\d+[dhms])+', token)` to validate each token.

Then for order checking:
- Map units to their order: d=0, h=1, m=2, s=3
- The sequence of units must be strictly increasing

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("Empty or blank string")
    
    stripped = s.strip()
    tokens = re.split(r'\s+', stripped)
    
    units_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen_units = []
    total = 0
    
    for token in tokens:
        if not re.fullmatch(r'(?:\d+[dhms])+', token):
            raise ValueError(f"Invalid token: {token}")
        
        parts = re.findall(r'(\d+)([dhms])', token)
        for num_str, unit in parts:
            if unit in seen_units:
                raise ValueError(f"Repeated unit: {unit}")
            if seen_units and units_order[unit] <= units_order[seen_units[-1]]:
                raise ValueError(f"Wrong order: {unit} after {seen_units[-1]}")
            seen_units.append(unit)
            total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to also check that the number is a non-negative integer. The regex `\d+` already ensures it's digits only (no signs, no decimals). But what about leading zeros? "01h" - is that valid? The spec says "non-negative integer" so "01" is a valid representation of a non-negative integer. I'll allow it.

Actually wait - let me re-read: "A part is <non-negative integer><unit>". So "0h" should be valid? I think so, since 0 is a non-negative integer.

Let me also consider: what about "1h  30m" (multiple spaces)? The split by `\s+` handles that.

What about tabs? `\s` includes tabs, so that should be fine.

Let me also think about whether the "other separators" in the error cases means that something like "1h,30m" or "1h;30m" should raise ValueError. Yes, because after splitting by whitespace, "1h,30m" would be a single token that doesn't match `(?:\d+[dhms])+`.

I think my solution looks correct. Let me also handle the case where the string has only whitespace - `s.strip()` would be empty, which I already check.

One more thing: what about a string like "1 h"? After stripping, splitting by `\s+` gives ["1", "h"]. "1" doesn't match `(?:\d+[dhms])+` and "h" doesn't either. So it would raise ValueError. Good.

What about "1h "? After stripping: "1h". Split: ["1h"]. Valid. Good.

I think this is solid. Let me finalize.
