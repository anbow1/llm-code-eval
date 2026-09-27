Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. Units must appear in order: d, h, m, s (each at most once)
4. Parts can be together or separated by spaces
5. Leading/trailing whitespace allowed
6. No normalization (90m is valid)
7. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. Each part must match the pattern: digits followed by a unit character
5. Validate that units are in correct order and not repeated
6. Convert to seconds

Let me think about edge cases:
- "1h 30m" → 3600 + 1800 = 5400
- "1d4s" → 86400 + 4 = 86404
- "90m" → 5400
- "45s" → 45
- "2d" → 172800
- "" → ValueError
- "   " → ValueError
- "1x" → ValueError (unknown unit)
- "1h1d" → ValueError (wrong order)
- "1h1h" → ValueError (repeated unit)
- "h" → ValueError (missing number)
- "1" → ValueError (number without unit)
- "1.5h" → ValueError (decimals)
- "-1h" → ValueError (signs)
- "1H" → ValueError (uppercase)
- "1h\t30m" → ValueError (other separators - tab is not a space)

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces". So only spaces (space character) are valid separators. Tabs, commas, etc. are not valid.

Let me think about the regex approach:
- After stripping, the string should match: `\d+[dhms](\s+\d+[dhms])*`
- But I also need to validate the order of units.

Actually, let me be more careful. The pattern for a single part is `\d+[dhms]`. The full string (after strip) should be a sequence of such parts, where parts are either adjacent or separated by one or more spaces.

So the regex for the whole thing would be: `^\d+[dhms](\s*\d+[dhms])*`

Wait, but "1h 30m" has a space between parts. And "1h30m" has no space. So the pattern is: parts separated by optional spaces (one or more).

Actually: `\d+[dhms]( +\d+[dhms])*` - this allows 0 or more occurrences of (space+number+unit) after the first part.

But wait, what about "1h  30m" (multiple spaces)? The rule says "one or more spaces". So ` +` (one or more spaces).

Let me use: `^\d+[dhms]( +\d+[dhms])*`

This ensures:
- Starts with digits + unit
- Followed by zero or more (one or more spaces + digits + unit)
- No leading/trailing spaces (handled by strip)
- No tabs or other whitespace

Then I need to validate:
- Units are in order d, h, m, s
- No repeated units

Let me write the function:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Check if the string matches the pattern
    # Parts: digits followed by unit, separated by optional spaces
    match = re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', s)
    if not match:
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Extract parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    # Validate order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen_units = set()
    prev_order = -1
    
    total = 0
    for num, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order: {unit} after {prev_order}")
        prev_order = order
        seen_units.add(unit)
        total += int(num) * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    return total
```

Wait, let me double-check the regex. `re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', s)`

- "1h30m" → matches: "1h" then "30m" (no space needed since the group is optional)

Wait, no. The group is `( +\d+[dhms])*` which requires a space before each subsequent part. So "1h30m" would be: "1h" matches `\d+[dhms]`, then "30m" needs to match `( +\d+[dhms])*` but there's no space before "30m". So it wouldn't match!

I need to fix this. The parts can be adjacent OR separated by spaces. So the separator between parts is either nothing or one or more spaces.

Pattern: `\d+[dhms](( *)\d+[dhms])*` - hmm, that's the same issue.

Actually: `\d+[dhms](\s*\d+[dhms])*` - but this would allow tabs too.

Let me think again. The separator between parts is either:
- Nothing (parts are adjacent): "1h30m"
- One or more spaces: "1h 30m", "1h  30m"

So the pattern between parts is: ` *` (zero or more spaces) or ` +` (one or more spaces). Combined: ` *` (zero or more spaces).

Wait, but the rule says "separated by one or more spaces". Does that mean if there's a space, it must be one or more? Or that the separator (if present) is one or more spaces? I think it means: parts can be adjacent OR separated by one or more spaces. Zero spaces (adjacent) is fine, one or more spaces is fine.

So the pattern is: `\d+[dhms]( *\d+[dhms])*`

But wait, ` *` means zero or more spaces. If zero, parts are adjacent. If one or more, they're separated. That works.

But I need to make sure there's no tab or other whitespace. Using ` ` (literal space) instead of `\s` ensures only spaces.

Let me verify:
- "1h30m" → "1h" then "30m" with 0 spaces between → matches `\d+[dhms]( *\d+[dhms])*`
- "1h 30m" → "1h" then " 30m" with 1 space → matches
- "1h  30m" → "1h" then "  30m" with 2 spaces → matches
- "1h\t30m" → tab is not a space → doesn't match → ValueError ✓

Let me also consider: what about "1h " (trailing space)? After strip, it becomes "1h", which is fine.

What about " 1h30m "? After strip, it becomes "1h30m", which is fine.

Now let me also handle the case where the string has only spaces (after strip it's empty) - that's already handled.

What about "1h 30m " (trailing space)? After strip: "1h 30m" → fine.

What about "1h  30m" with multiple spaces? After strip: "1h  30m" → the regex ` *\d+[dhms]` matches "  30m" → fine.

I think the solution is correct. Let me also make sure the error messages are reasonable.

Actually, I realize I should double-check: does the problem say "one or more spaces" as the separator, meaning you CAN'T have zero spaces between parts? Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So "written together" means no separator (zero spaces), and "separated by one or more spaces" means the separator is one or more spaces. Both are valid. So ` *` (zero or more spaces) is correct for the separator.

My solution looks good. Let me finalize it.
