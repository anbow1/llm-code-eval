Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: parts of `<non-negative integer><unit>` where units are d, h, m, s
3. No space between number and unit
4. Units must appear in order: d, h, m, s (each at most once, any subset)
5. Parts can be together or separated by one or more spaces
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by one or more spaces (but not the number-unit parts)
- Each part must match: `^\d+[dhms]$`
- Check that units are in correct order (d < h < m < s in terms of index)
- Check no repeated units
- Convert to seconds

Wait, let me reconsider the splitting. "1h 30m" - split by spaces gives ["1h", "30m"]. "1h30m" - this is one token but has two parts.

Actually, I think the better approach is to use regex to find all parts within the string (after stripping whitespace), and also validate that the string is properly formed.

Let me think again. The string after stripping whitespace should consist of parts separated by one or more spaces. Each part (after splitting by spaces) could contain multiple units stuck together.

Wait, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So "1h30m" is a valid single "part" in the sense that the parts are written together. But internally it's two duration components: 1h and 30m.

Let me use a regex approach:
1. Strip the string
2. If empty, raise ValueError
3. The entire string (after strip) should match a pattern where:
   - Components are `\d+[dhms]`
   - Components can be adjacent or separated by one or more spaces
   - Units are in order d, h, m, s
   - No unit repeated

Let me use a regex to extract all components: `(\d+)([dhms])` but I need to make sure the entire string is composed of these components separated by optional spaces.

Actually, let me think about this more carefully. The string after stripping should match:
`^\d+[dhms](\s*\d+[dhms])*`

Wait, but spaces can be "one or more" between parts. Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So between two duration components, either nothing (stuck together) or one or more spaces.

The overall pattern for the stripped string would be:
`^\d+[dhms](?:\s+\d+[dhms]|\d+[dhms])*`

Wait, that's not quite right either. Let me think...

Actually, each "part" is `<number><unit>`. Parts can be adjacent or separated by spaces. So the stripped string should match:
`^\d+[dhms](?:\s*\d+[dhms])*$`

Hmm, but `\s*` would allow zero spaces (adjacent) or multiple spaces. But what about a single space? `\s*` covers that too. But wait, `\s` includes tabs, newlines, etc. The spec says "one or more spaces". Let me re-read.

"separated by one or more spaces" - I think "spaces" here means the space character specifically, or whitespace in general. Let me use `\s+` for the separator since the spec says "one or more spaces" and leading/trailing whitespace is allowed (which suggests whitespace in general is okay for stripping).

Actually, I think the safest interpretation is:
- After stripping, the string should be a sequence of `\d+[dhms]` tokens separated by `\s+` (one or more whitespace chars) or nothing.

So the pattern for the entire stripped string: `^\d+[dhms](?:\s+\d+[dhms])*$`

Wait, but this doesn't allow adjacent parts without space. Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

"1h30m" - here the parts are "1h" and "30m" written together (no separator). So between parts, it's either nothing or one or more spaces.

Pattern: `^\d+[dhms](?:(?:\s+)?\d+[dhms])*$`

This says: first part, then zero or more subsequent parts where each is optionally preceded by one or more spaces.

Let me verify:
- "1h30m" → matches: "1h" then "30m" (no space between) ✓
- "1h 30m" → matches: "1h" then " 30m" (space between) ✓
- "1h  30m" → matches: "1h" then "  30m" (multiple spaces) ✓
- " 1h 30m " → after strip: "1h 30m" ✓

Now for validation of unit order and uniqueness, I'll extract all (number, unit) pairs and check.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")
    
    # Check the overall format
    if not re.fullmatch(r'\d+[dhms](?:(?:\s+)?\d+[dhms])*', stripped):
        raise ValueError("invalid format")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Check unit order and uniqueness
    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    total = 0
    
    for num, unit in parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if order[unit] <= last_order:
            raise ValueError(f"wrong order: {unit}")
        seen.add(unit)
        last_order = order[unit]
        total += int(num) * multipliers[unit]
    
    return total
```

Wait, let me check edge cases:
- "0" - no unit, should fail. `re.fullmatch` won't match since we need a unit. ✓
- "0s" - valid, returns 0. ✓
- "1H" - uppercase, won't match `[dhms]`. ✓
- "1.5h" - decimal, `\d+` won't match "1.5" as a whole, and "5h" would be left over... actually let me check. `re.fullmatch(r'\d+[dhms](?:(?:\s+)?\d+[dhms])*', "1.5h")` - `\d+` matches "1", then `[dhms]` needs to match "." - no. So it fails. ✓
- "+1h" - sign, `\d+` won't match "+". ✓
- "1x" - unknown unit, `[dhms]` won't match. ✓
- "1h2d" - wrong order. The regex will match it, but the order check will catch it. ✓
- "1h1h" - repeated unit. The regex will match it, but the uniqueness check catches it. ✓

Wait, what about "1h s" or "1h s"? After strip: "1h s". The regex: `\d+[dhms]` matches "1h", then `(?:\s+\d+[dhms])` needs to match " s" - but "s" has no number before it. So it fails. ✓

What about "1h 30" - after strip "1h 30". Regex: `\d+[dhms]` matches "1h", then `(?:\s+\d+[dhms])` needs to match " 30" - "30" has no unit. Fails. ✓

What about "  " (just spaces)? After strip: "". Empty check catches it. ✓

What about "1h\t30m"? The `\s+` in the regex matches tabs too. The spec says "one or more spaces". Hmm, does "spaces" mean literally space characters or whitespace? Given that "Leading/trailing whitespace is allowed", I think whitespace is acceptable. I'll keep `\s+`.

Actually wait, let me re-read the error conditions: "other separators". This suggests that if there's a separator that's not a space (or whitespace), it should fail. But what about "1h,30m"? The comma isn't a space, so it would fail the regex. ✓

What about "1h\t30m"? Tab is whitespace. I think it's reasonable to accept it as a separator. The spec says "one or more spaces" which might mean literally space characters. But given the ambiguity and that "whitespace" is mentioned for leading/trailing, I'll go with `\s+`.

Hmm, actually let me reconsider. The spec says "separated by one or more spaces". In common parlance, "spaces" might mean just the space character (0x20). But "Leading/trailing whitespace is allowed" uses "whitespace". I think the safest is to use `\s+` for the separator to be consistent with the whitespace handling.

Let me also consider: what if there's a newline in the middle? "1h\n30m". I think that's probably fine as a separator. I'll go with `\s+`.

One more thing: the number is a "non-negative integer". So "0h" is valid. "00h" - is that valid? `\d+` matches "00", and int("00") = 0. I think it's fine. The spec says "non-negative integer" which allows leading zeros typically.

Let me also consider: what about very large numbers? Python handles big integers natively, so no issue.

I think my solution is correct. Let me finalize it.
