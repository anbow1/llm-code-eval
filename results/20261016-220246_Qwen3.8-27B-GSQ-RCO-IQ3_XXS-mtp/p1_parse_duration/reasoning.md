Let me analyze the requirements carefully:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. Units in order: d, h, m, s (each at most once, any subset)
4. No space between number and unit
5. Parts can be together ("1h30m") or separated by spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization (90m = 5400 seconds)
8. ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the regex approach:

The valid pattern would be:
- Optional leading whitespace
- One or more parts separated by one or more spaces
- Each part is: `\d+[dhms]`
- Optional trailing whitespace

But I also need to enforce:
- Units in order d, h, m, s
- Each unit at most once
- No missing number (so `\d+` not `\d*`)
- No decimals (so no `.`)
- No signs (so no `+` or `-`)
- No uppercase
- No other separators

Let me think about the regex:

After stripping whitespace, the string should match:
`^\d+(?:[dhms])` for a single part, or with spaces: `\d+[dhms](?:\s+\d+[dhms])*`

Wait, let me reconsider. The parts are separated by "one or more spaces". So:

Pattern after stripping: `^\d+[dhms](\s+\d+[dhms])*$`

This handles:
- "2d" → matches
- "1h30m" → matches (1h then 30m with no space, which is part of the first group... wait no)

Actually wait. "1h30m" - this is two parts written together. The regex `\d+[dhms](\s+\d+[dhms])*$` would try to match "1h30m" as a single part. Let me think...

Actually "1h30m" should be parsed as "1h" and "30m". The regex `\d+[dhms](\s+\d+[dhms])*$` would try to match "1h30m" as one token. `\d+` matches "1", `[dhms]` matches "h", then we'd need `\s+\d+[dhms]` but there's no space before "30m". So it wouldn't match!

I need to handle the case where parts are written together WITHOUT spaces. So "1h30m" should be valid.

Let me reconsider. The pattern should be:
- Each part is `\d+[dhms]`
- Parts can be separated by zero or more spaces (but the problem says "one or more spaces" for separation)

Wait, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So parts are either directly adjacent or separated by spaces. The regex for the whole thing (after stripping) would be:

`\d+[dhms](\s*\d+[dhms])*`

But wait, "separated by one or more spaces" - does this mean you can't have zero spaces between parts? No, "written together" means no spaces. So between two parts, there's either zero spaces (written together) or one or more spaces (separated).

So: `\d+[dhms](\s*\d+[dhms])*` - this allows zero or more spaces between parts.

But wait, we need to be careful. If we allow `\s*` between parts, then "1h  30m" (multiple spaces) is fine, and "1h30m" is fine.

Let me verify with the regex: `^\d+[dhms](\s*\d+[dhms])*$`

- "2d" → `\d+` = "2", `[dhms]` = "d", no more parts. ✓
- "1h30m" → `\d+` = "1", `[dhms]` = "h`, then `\s*` = "", `\d+` = "30", `[dhms]` = "m". ✓
- "1h 30m" → `\d+` = "1", `[dhms]` = "h`, then `\s*` = " ", `\d+` = "30", `[dhms]` = "m". ✓
- "1d4s" → `\d+` = "1", `[dhms]` = "d`, then `\s*` = "", `\d+` = "4`, `[dhms]` = "s". ✓
- "" → doesn't match. ✓
- "  2d  " → after stripping, "2d" matches. ✓
- "1H" → `[dhms]` doesn't match "H". ✓
- "1x" → doesn't match. ✓
- "1.5h" → `\d+` matches "1", `[dhms]` doesn't match ".". Doesn't match full string. ✓
- "1h2h" → would match as "1h" and "2h", but then we check for repeated unit. ✓
- "1s2d" → would match as "1s" and "2d", but then we check for wrong order. ✓

Now after the regex match, I need to validate:
1. Units are in order d, h, m, s
2. Each unit appears at most once

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Match the overall pattern
    match = re.fullmatch(r'\d+[dhms](?:\s*\d+[dhms])*', s)
    if not match:
        raise ValueError(f"invalid duration: {s!r}")
    
    # Extract parts
    parts = re.findall(r'\d+[dhms]', s)
    
    # Validate units
    valid_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    last_pos = -1
    total = 0
    seen = set()
    
    for part in parts:
        unit = part[-1]
        number = int(part[:-1])
        
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        seen.add(unit)
        
        pos = valid_order[unit]
        if pos < last_pos:
            raise ValueError(f"wrong unit order: {unit} after previous")
        last_pos = pos
        
        total += number * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    return total
```

Wait, let me double-check the regex. `re.fullmatch(r'\d+[dhms](?:\s*\d+[dhms])*', s)` 

For "1h30m": The regex engine tries to match. `\d+` greedily matches "1" (can't go further since next char is 'h'). `[dhms]` matches "h". Then `(?:\s*\d+[dhms])*`: `\s*` matches "" (zero spaces), `\d+` matches "30", `[dhms]` matches "m". Then the group tries again: `\s*` matches "", `\d+` needs at least one digit but we're at end of string. So the group matches once. Total match: "1h30m". ✓

For "1h 30m": `\d+` = "1", `[dhms]` = "h". Group: `\s*` = " ", `\d+` = "30", `[dhms]` = "m". ✓

For "12h 34m 56s": `\d+` = "12", `[dhms]` = "h". Group: `\s*` = " ", `\d+` = "34", `[dhms]` = "m". Group again: `\s*` = " ", `\d+` = "56", `[dhms]` = "s". ✓

What about "0s"? `\d+` = "0", `[dhms]` = "s". Valid, returns 0. ✓

What about "00s"? `\d+` = "00", `[dhms]` = "s". Valid, returns 0. Is this okay? The problem says "non-negative integer" so leading zeros should be fine.

What about "1h30m5"? After stripping, the regex: `\d+` = "1", `[dhms]` = "h". Group: `\s*` = "", `\d+` = "30", `[dhms]` = "m". Group: `\s*` = "", `\d+` = "5"... but then we need `[dhms]` and there's nothing. So the second group iteration fails. The full match fails because "5" is left unmatched. ✓

What about "1 h"? After stripping: "1 h". `\d+` = "1", `[dhms]` needs to match " " - fails. Doesn't match. ✓ (number without unit / space between number and unit)

What about "h"? No digits. Doesn't match. ✓

What about "1.5h"? `\d+` = "1", `[dhms]` needs to match "." - fails. ✓

What about "+1h"? `\d+` needs to match "+" - fails. ✓

What about "1h-2s"? `\d+` = "1", `[dhms]` = "h". Group: `\s*` = "", `\d+` needs to match "-" - fails. Full match fails. ✓

Looks good. Let me also make sure the `re.findall` correctly extracts all parts. For "1h30m", `re.findall(r'\d+[dhms]', "1h30m")` should give ["1h", "30m"]. Let me verify: the regex engine finds "1h" starting at 0, then continues from position 2, finds "30m". Yes. ✓

One more edge case: what about multiple consecutive spaces like "1h   30m"? The `\s*` in the group handles that. And `re.findall` would still correctly extract "1h" and "30m". ✓

I think the solution is correct. Let me finalize it.
