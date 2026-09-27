Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<number><unit>` parts where units are d, h, m, s
3. Units must appear in order: d, h, m, s (each at most once)
4. Parts can be together or separated by spaces
5. Leading/trailing whitespace is allowed
6. No normalization needed
7. Various invalid cases raise ValueError

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after stripping, raise ValueError
3. Split by whitespace to get individual parts
4. Each part must match pattern: `<positive integer><unit>` where unit is one of d, h, m, s
5. Check that units appear in the correct order (d before h before m before s)
6. Check no repeated units
7. Calculate total seconds

Wait, let me re-read: "missing number" - so what about "0d"? It says "non-negative integer" so 0 is allowed. What about "0s"? That should be valid.

Let me think about edge cases:
- "1h 30m" - valid, 5400 seconds
- "  1h 30m  " - valid (leading/trailing whitespace)
- "1h30m" - valid
- "90m" - valid, 5400
- "45s" - valid
- "" - ValueError
- "  " - ValueError (blank string)
- "1h2h" - ValueError (repeated unit)
- "30m1h" - ValueError (wrong order)
- "1x" - ValueError (unknown unit)
- "h" - ValueError (missing number)
- "1" - ValueError (number without unit)
- "1.5h" - ValueError (decimals)
- "-1h" - ValueError (signs)
- "1H" - ValueError (uppercase)
- "1h-30m" - ValueError (other separators)

Wait, what about "0"? Is that a valid number? "non-negative integer" means 0 is allowed. So "0s" should be valid and return 0.

Actually, let me reconsider. The rule says "A part is <non-negative integer><unit>". So each part must have both a number and a unit.

Let me use a regex approach:
- After stripping whitespace, split by one or more spaces
- Each token must match `^\d+[dhms]$` (one or more digits followed by exactly one valid unit char)

Wait, but I need to be careful. What if someone writes "1h30m"? That should be parsed as two parts: "1h" and "30m". So I need to use a regex to find all matches of the pattern within the string.

Actually, let me reconsider the approach. Instead of splitting by spaces, I should:
1. Strip the string
2. Check if empty
3. Use a regex to find all parts: `\d+[dhms]`
4. But I also need to verify that the ENTIRE string (after stripping) is composed only of these parts with optional spaces between them

Let me think differently:
1. Strip whitespace
2. If empty, ValueError
3. Use regex to validate the entire string matches: `^\d+[dhms](\s*\d+[dhms])*`
4. Extract all the parts
5. Check order and uniqueness of units
6. Calculate total

Actually, let me use `re.findall` and `re.fullmatch` or a pattern that matches the whole thing.

The pattern for the whole string (after stripping) would be:
`^\d+[dhms](\s+\d+[dhms])*$`

This ensures:
- First part is `<digits><unit>`
- Subsequent parts are preceded by one or more spaces
- No other characters allowed

Wait, but what about "1h30m"? That has no space. So the pattern should allow parts to be adjacent.

Hmm, let me reconsider. The parts can be:
- Together: "1h30m"
- Separated by spaces: "1h 30m"

So the whole string (after strip) should match:
`^\d+[dhms](\d+[dhms]| +\d+[dhms])*$`

Actually, it's simpler to just use:
`^(?:\d+[dhms])(?:\s*\d+[dhms])*$`

Wait no, that would allow "1h30m" to be parsed as "1h", "30m" which is fine, but it would also allow "1h  30m" (multiple spaces) which should be fine per the rules.

Let me just use: `^\d+[dhms](\s*\d+[dhms])*$`

After stripping, this ensures the entire string is valid format.

Then I can extract all parts with `re.findall(r'\d+[dhms]', s)`.

Then check:
- The sequence of units must be a subsequence of "dhms" (strictly increasing in that order)
- No repeated units (implied by the subsequence check since we need strictly increasing)

Wait, "strictly increasing" in terms of position in "dhms" means each subsequent unit must come after the previous one. So if I have units [d, h, m, s], their indices must be strictly increasing: 0 < 1 < 2 < 3.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Validate the entire string format
    if not re.fullmatch(r'\d+[dhms](\s*\d+[dhms])*', s):
        raise ValueError(f"invalid duration format: {s!r}")
    
    # Extract parts
    parts = re.findall(r'\d+[dhms]', s)
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    last_order = -1
    seen_units = set()
    
    for part in parts:
        unit = part[-1]
        number = int(part[:-1])
        
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        
        if unit_order[unit] <= last_order:
            raise ValueError(f"wrong unit order")
        
        seen_units.add(unit)
        last_order = unit_order[unit]
        total += number * unit_seconds[unit]
    
    return total
```

Let me verify with examples:
- "2d" → 2*86400 = 172800 ✓
- "1h30m" → 1*3600 + 30*60 = 3600+1800 = 5400 ✓
- "45s" → 45 ✓
- "1d4s" → 86400+4 = 86404 ✓
- "90m" → 5400 ✓
- "1h 30m" → 5400 ✓

Invalid cases:
- "" → strip gives "" → ValueError ✓
- "  " → strip gives "" → ValueError ✓
- "1h2h" → regex matches, but "h" repeated → ValueError ✓
- "30m1h" → regex matches, but order wrong → ValueError ✓
- "1x" → regex doesn't match → ValueError ✓
- "h" → regex doesn't match → ValueError ✓
- "1" → regex doesn't match → ValueError ✓
- "1.5h" → regex doesn't match → ValueError ✓
- "-1h" → regex doesn't match → ValueError ✓
- "1H" → regex doesn't match (uppercase) → ValueError ✓
- "1h-30m" → regex doesn't match → ValueError ✓

Looks good. Let me also consider "0s" - that's 0 seconds, valid. And "0" alone would fail the regex since there's no unit.

One more edge: what about "1d 2h 3m 4s"? After stripping, the regex `^\d+[dhms](\s*\d+[dhms])*$` should match. Let me trace: "1d" matches `\d+[dhms]`, then " 2h" matches `\s*\d+[dhms]`, then " 3m" matches, then " 4s" matches. Yes, that works.

I think the solution is correct. Let me finalize it.
