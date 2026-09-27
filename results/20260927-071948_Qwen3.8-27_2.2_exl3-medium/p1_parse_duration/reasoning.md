Let me analyze the requirements carefully:

1. A duration string like "1d2h3m4s" or "1h 30m" or "  45s  "
2. Each part is `<non-negative integer><unit>` with no space between number and unit
3. Units: d (86400), h (3600), m (60), s (1)
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Any subset is allowed
7. Parts can be together or separated by one or more spaces
8. Leading/trailing whitespace allowed
9. No normalization - "90m" is valid (5400 seconds)
10. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- Split by spaces (one or more)
- Each part must match pattern: `\d+[dhms]`
- Validate order: d before h before m before s
- Validate no repeated units
- Validate no decimals, signs, etc.

Let me think about edge cases:
- "0s" → 0 seconds (valid, non-negative integer)
- "0" → invalid (no unit)
- "1.5s" → invalid (decimals)
- "-1s" → invalid (signs)
- "1D" → invalid (uppercase)
- "1d2d" → invalid (repeated unit)
- "1m1h" → invalid (wrong order)
- "1d 2h 3m 4s" → valid
- "1d2h3m4s" → valid
- "  1h 30m  " → valid
- "" → ValueError
- "   " → ValueError (blank)
- "1x" → ValueError (unknown unit)
- "1" → ValueError (number without unit)
- "s" → ValueError (missing number)
- "1 2" → ValueError (number without unit, or space-separated without units)

Wait, let me reconsider. The split by spaces gives us parts. Each part must be `<digits><unit>`. Let me use a regex approach.

Pattern for each part: `^\d+[dhms]$`

Then I need to:
1. Strip the string
2. If empty, raise ValueError
3. Split by whitespace (one or more spaces)
4. For each part, validate it matches `\d+[dhms]`
5. Check that units are in correct order (d < h < m < s)
6. Check no repeated units
7. Calculate total seconds

Let me think about the regex more carefully:
- `\d+` - one or more digits (non-negative integer, no leading + or -)
- `[dhms]` - one unit character

What about "00s"? That's valid - it's a non-negative integer.
What about "0001s"? Also valid.

Let me write the solution:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    parts = s.split()
    
    # Each part must match digits followed by a unit
    pattern = re.compile(r'^\d+[dhms]$')
    
    units_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    units_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen_units = set()
    last_order = -1
    total = 0
    
    for part in parts:
        if not pattern.match(part):
            raise ValueError(f"invalid part: {part}")
        
        unit = part[-1]
        number = int(part[:-1])
        
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        
        order = units_order[unit]
        if order <= last_order:
            raise ValueError(f"wrong order: {unit}")
        
        seen_units.add(unit)
        last_order = order
        total += number * units_seconds[unit]
    
    return total
```

Wait, let me reconsider. The `split()` method splits on any whitespace. But the requirement says "separated by one or more spaces". Does `split()` handle tabs? The requirement says "other separators" should raise ValueError. So I should only split on spaces, not tabs or other whitespace.

Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces." And "other separators" should raise ValueError.

So I should split on spaces only. Let me use `re.split(r' +', s)` after stripping.

Actually, let me reconsider. If I strip and then split on spaces:
- "1h 30m" → ["1h", "30m"] ✓
- "1h\t30m" → this should be invalid (tab is an "other separator")

So I should:
1. Strip leading/trailing whitespace (spaces only? or all whitespace?)
2. Split on one or more spaces

Hmm, "Leading/trailing whitespace is allowed." This probably means spaces. But what about tabs? I think for safety, I'll treat the split as specifically spaces.

Let me use: `s = s.strip()` then `parts = re.split(r' +', s)`

Wait, but if there's a tab in the middle, `re.split(r' +', s)` won't split on it, so "1h\t30m" would be one part "1h\t30m" which wouldn't match the pattern → ValueError. Good.

But what about leading/trailing whitespace - should I strip all whitespace or just spaces? The problem says "Leading/trailing whitespace is allowed." I'll strip all whitespace to be safe, but actually let me just strip spaces since the problem specifically mentions spaces as separators.

Actually, re-reading: "Leading/trailing whitespace is allowed." I think this means any whitespace. Let me just use `s.strip()` which removes all whitespace.

Then for splitting: I'll use `re.split(r' +', s)` to split on one or more spaces. If there's a tab, it won't be split, and the resulting token won't match the pattern, so it'll raise ValueError. That's correct behavior.

Wait, but what if after stripping, the string has a tab in the middle? Like "1h\t30m". After strip, it's still "1h\t30m". `re.split(r' +', s)` gives ["1h\t30m"]. The pattern `^\d+[dhms]$` won't match → ValueError. Good.

Let me also think about: what if the string is just spaces? After strip, it's empty → ValueError. Good.

What about "1h  30m" (two spaces)? `re.split(r' +', s)` → ["1h", "30m"]. Good.

I think my solution is correct. Let me finalize it.

Actually wait - I need to double-check: "non-negative integer" - does "0" count? Yes, 0 is non-negative. And "00" is also a valid non-negative integer. The regex `\d+` handles all of these.

One more thing: the problem says "NO space between number and unit". So "1 h" is invalid. With my approach, "1 h" after strip and split on spaces gives ["1", "h"]. "1" doesn't match `^\d+[dhms]$` → ValueError. Good.

I think the solution is solid. Let me write it up.
