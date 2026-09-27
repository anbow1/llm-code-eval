Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Parts are `<non-negative integer><unit>` with no space between number and unit
3. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
4. Units must appear in order: d, h, m, s. Each at most once. Any subset allowed.
5. Parts can be together ("1h30m") or separated by one or more spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by spaces (one or more) to get parts
- Each part must match pattern: digits followed by a single unit character
- Validate the order of units
- Validate no repeated units
- Calculate total seconds

Let me think about edge cases:
- "  1h 30m  " → strip → "1h 30m" → split → ["1h", "30m"] → valid
- "1h30m" → split by spaces → ["1h30m"] → this is ONE part, so I need to parse it differently

Wait, if parts can be written together, then splitting by spaces gives me segments, but each segment could contain multiple parts. So I need to use regex to find all parts within the string.

Let me reconsider. The string after stripping should consist of:
- One or more parts
- Parts are separated by zero or more spaces (but if there are spaces, they must be between parts)

Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the structure is: `[part( space* part)*]` where part is `\d+[dhms]`

But I also need to reject:
- Other separators (tabs, etc.)
- Unknown units
- Wrong order
- Repeated units
- Missing number (like "h" without a number)
- Number without unit (like "123")
- Decimals (like "1.5h")
- Signs (like "-1h" or "+1h")
- Uppercase units (like "1H")

Approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex to validate and parse

Let me use a regex approach:
- The entire string (after strip) should match: `(\d+[dhms])(\s+\d+[dhms])*`

Wait, but I also need to handle the case where parts are separated by spaces. Let me think...

After stripping, the string should match: `\d+[dhms](\s+\d+[dhms])*`

But this doesn't reject tabs. Let me be more specific about whitespace - only spaces (not tabs, not other whitespace).

Actually, re-reading: "separated by one or more spaces" - I think this means literal space characters only. Let me use ` ` (space) specifically, not `\s`.

So the pattern after strip would be: `\d+[dhms]( +\d+[dhms])*`

But wait, I also need to make sure there's nothing else in the string. Let me use fullmatch.

Pattern: `^(?:(\d+)([dhms]))( *(?:(\d+)([dhms])))*$`

Hmm, let me simplify. After stripping:
- Full match: `\d+[dhms]( +\d+[dhms])*`

This ensures:
- At least one part
- Parts are `\d+[dhms]`
- Between parts, one or more spaces
- No other characters

Then I extract all parts with regex findall: `(\d+)([dhms])`

Then validate:
- Order: d < h < m < s (indices 0, 1, 2, 3)
- No repeats
- Each part has a number (guaranteed by regex)

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Check that the string only contains digits, unit chars, and spaces
    # And matches the overall pattern
    if not re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    last_order = -1
    seen_units = set()
    
    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong order: {unit} after previous unit")
        last_order = order
        seen_units.add(unit)
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, let me double-check with the test cases:
- "2d" → parts: [("2", "d")] → 2*86400 = 172800 ✓
- "1h30m" → parts: [("1", "h"), ("30", "m")] → 3600 + 1800 = 5400 ✓
- "45s" → parts: [("45", "s")] → 45 ✓
- "1d4s" → parts: [("1", "d"), ("4", "s")] → 86400 + 4 = 86404 ✓
- "1h 30m" → parts: [("1", "h"), ("30", "m")] → 5400 ✓
- "90m" → parts: [("90", "m")] → 5400 ✓
- "  1h 30m  " → strip → "1h 30m" → same as above ✓

Error cases:
- "" → strip → "" → ValueError ✓
- "   " → strip → "" → ValueError ✓
- "1H" → regex doesn't match (H not in [dhms]) → ValueError ✓
- "1h30H" → regex doesn't match → ValueError ✓
- "1h 30h" → regex matches, but repeated unit → ValueError ✓
- "30m1h" → regex matches, but wrong order → ValueError ✓
- "123" → regex doesn't match (no unit) → ValueError ✓
- "h" → regex doesn't match (no number) → ValueError ✓
- "1.5h" → regex doesn't match (dot not allowed) → ValueError ✓
- "-1h" → regex doesn't match (minus not allowed) → ValueError ✓
- "+1h" → regex doesn't match (plus not allowed) → ValueError ✓
- "1h\t30m" → after strip, the tab is not a space, regex doesn't match → ValueError ✓

Wait, what about "1h  30m" (two spaces)? The regex ` +` allows one or more spaces, so this should work. ✓

What about "0s"? → parts: [("0", "s")] → 0. Is 0 a valid non-negative integer? Yes. ✓

What about "00s"? → parts: [("00", "s")] → 0. Leading zeros... the spec says "non-negative integer" so "00" should be fine as it's still a non-negative integer. Let me keep it.

I think this solution is correct. Let me finalize it.
