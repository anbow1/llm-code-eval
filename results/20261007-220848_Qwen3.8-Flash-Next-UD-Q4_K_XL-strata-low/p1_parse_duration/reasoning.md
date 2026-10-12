Let me think through this carefully.

I need to parse a duration string like "1d2h30m45s" or "1d 2h 30m 45s" into total seconds.

Rules:
1. Parts are `<non-negative integer><unit>` with no space between number and unit
2. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
3. Units must appear in order d, h, m, s; each at most once
4. Parts can be concatenated or separated by spaces
5. Leading/trailing whitespace allowed
6. "90m" is valid (no normalization)
7. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase, other separators

Approach:
- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Parse the string character by character or use regex

Let me think about parsing strategy:

Option 1: Regex approach
- Split by spaces to get tokens
- Validate each token matches pattern `(\d+)(d|h|m|s)`
- Check order and uniqueness

Wait, but parts can be written together without spaces, like "1h30m". So splitting by spaces isn't enough.

Option 2: Use regex to find all matches of `(\d+)([dhms])` and validate they cover the entire string.

Let me think more carefully:

1. Strip the string
2. If empty, raise ValueError
3. Use regex to find all matches of `(\d+)([dhms])` 
4. Verify that the concatenation of all matches equals the stripped string (with spaces removed)
5. Check order: d < h < m < s (by position in the order string)
6. Check no repeats
7. Compute total

Wait, but spaces are allowed between parts. So the stripped string might have spaces. Let me think again.

Better approach:
1. Strip leading/trailing whitespace
2. If empty, raise ValueError
3. Remove internal spaces? No, that could cause issues. Actually no - spaces only separate parts, and within a part there's no space. So I can split by spaces (one or more) to get tokens.

Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the format is: parts separated by optional whitespace. Parts can also be concatenated directly.

So the full pattern is: `(\d+[dhms])(\s*\d+[dhms])*`

Let me use a regex to match the entire string:
`^\s*((?:\d+[dhms]\s*)+)\s*$` - hmm, this isn't quite right either.

Actually, let me think of it as: the string is a sequence of parts, optionally separated by whitespace. Each part is `\d+[dhms]`.

Regex for the whole thing: `^\s*(\d+[dhms])((\s*)(\d+[dhms]))*\s*$`

Or simpler: use `re.fullmatch` with pattern `^[\s]*(\d+[dhms][\s]*)+$`

Wait, let me be more careful. The pattern should be:
- Optional leading whitespace
- One or more parts (each `\d+[dhms]`)
- Optional spaces between parts
- Optional trailing whitespace

So: `^\s*\d+[dhms](\s*\d+[dhms])*\s*$`

Let me verify:
- "1h30m" → matches `\d+[dhms]` = "1h", then `\s*\d+[dhms]` = "" + "30m" ✓
- "1h 30m" → matches "1h", then `\s*\d+[dhms]` = " " + "30m" ✓
- "1d 2h 30m 45s" → matches all parts ✓

Then from the full match, I extract all `(\d+)([dhms])` groups.

After validating the overall format, I need to:
1. Check units are in order d, h, m, s
2. Check no unit is repeated
3. Compute total seconds

Let me also handle edge cases:
- Empty string → ValueError
- String with only spaces → ValueError (strip makes it empty)
- "90m" → valid, 5400
- "0s" → valid, 0
- "1d2h3m4s" → valid
- "1h1h" → ValueError (repeated unit)
- "30m1h" → ValueError (wrong order)
- "1H" → ValueError (uppercase)
- "1.5h" → ValueError (decimal) - the regex won't match because `.` is not in `\d`
- "-1h" → ValueError (sign) - regex won't match
- "1" → ValueError (number without unit) - regex won't match
- "h" → ValueError (missing number) - regex won't match

Wait, for "1H" - the regex `[dhms]` won't match uppercase, so it'll fail. Good.

For "1.5h" - the regex `(\d+[dhms])` won't match "1.5h" as a whole. Let me think... `re.fullmatch(r'\s*\d+[dhms](\s*\d+[dhms])*\s*', "1.5h")` - this won't match because "." is not in `\d` and not in `\s`. Good.

For "-1h" - similarly won't match. Good.

For "1 " (trailing space with no unit) - `re.fullmatch(r'\s*\d+[dhms](\s*\d+[dhms])*\s*', "1 ")` - "1" alone doesn't match `\d+[dhms]` because it needs a unit after the digits. Wait, "1 " - the regex needs `\d+[dhms]` which requires at least one digit followed by a unit character. "1" has no unit char, so it won't match. Good.

What about "h" (unit without number)? `\d+` requires at least one digit, so "h" alone won't match. Good.

Let me also think about: what if there's a number like "01h"? The rules say "non-negative integer". "01" is technically a valid integer representation. I'll allow it since it's just digits.

What about very large numbers? Python handles big ints natively, so that's fine.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Match the overall format
    pattern = r'\d+[dhms](\s*\d+[dhms])*'
    if not re.fullmatch(pattern, stripped):
        raise ValueError(f"Invalid duration format: {s!r}")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Check order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    
    total = 0
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        if unit_order[unit] <= last_order:
            raise ValueError(f"Wrong order: {unit} after previous unit")
        seen.add(unit)
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the `re.fullmatch` behavior. Let me trace through "1h 30m":
- stripped = "1h 30m"
- pattern = `\d+[dhms](\s*\d+[dhms])*`
- "1h" matches `\d+[dhms]`, then " 30m" matches `\s*\d+[dhms]` ✓

"1h30m":
- "1h" matches `\d+[dhms]`, then "30m" matches `\s*\d+[dhms]` (with zero spaces) ✓

"1h  30m" (two spaces):
- "1h" matches, then "  30m" matches `\s*\d+[dhms]` ✓

Looks good. Let me also consider: what about "1h " (trailing space)?
- stripped = "1h" (strip removes trailing space) ✓

What about "  1h  " (leading/trailing spaces)?
- stripped = "1h" ✓

What about "1h\t30m" (tab separator)? The `\s` in regex matches tabs too. Is that allowed? The problem says "separated by one or more spaces". Hmm, "spaces" might mean literal space characters only. Let me re-read: "separated by one or more spaces ("1h 30m")". 

I think "spaces" here refers to whitespace in general (spaces, tabs, etc.). But to be safe, I could use `[ ]+` instead of `\s+` for the separator. Actually, the problem says "Leading/trailing whitespace is allowed" which uses the word "whitespace". For separators it says "spaces". I'll use `\s` for both leading/trailing (which I handle with strip()) and for separators, I'll use `\s` as well since it seems reasonable.

Actually wait - let me re-read: "separated by one or more spaces". I think this means space characters specifically. But "Leading/trailing whitespace is allowed" uses "whitespace". To be safe and strict, let me use literal space for separators and `strip()` handles whitespace at ends.

Hmm, but if someone passes "1h\t30m", should that be valid or invalid? The spec says "separated by one or more spaces" which I'll interpret as space characters. Let me use `[ ]*` instead of `\s*` for the separator.

Actually, I'll keep `\s*` for the separator since it's more practical and the problem likely means general whitespace separation. But actually, the problem says "other separators" should raise ValueError. Tabs could be considered "other separators". Let me use space only for the separator to be strict.

Let me revise: use `[ ]*` for the internal separator.

Actually, I'll reconsider. "Leading/trailing whitespace is allowed" - `strip()` handles all whitespace. For internal separators, the spec says "one or more spaces". I'll use ` ` (space) only for internal separation to be strict about "other separators" raising ValueError.

Let me finalize:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Match: parts optionally separated by spaces
    pattern = r'\d+[dhms]( [ ]*\d+[dhms])*'
    # Hmm, that's redundant. Let me just use `\s*` or ` *`
    pattern = r'\d+[dhms]( *\d+[dhms])*'
    
    if not re.fullmatch(pattern, stripped):
        raise ValueError(f"Invalid duration format: {s!r}")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Check order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    total = 0
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        if unit_order[unit] <= last_order:
            raise ValueError(f"Wrong order: units must be in order d, h, m, s")
        seen.add(unit)
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I should double check - does `re.fullmatch` work correctly here? Let me think about edge cases:

- "1d2h3m4s" → `\d+[dhms]` matches "1d", then ` *\d+[dhms]` matches "2h", "3m", "4s" ✓
- "1D" → `[dhms]` doesn't match "D" → fullmatch fails ✓
- "1" → `\d+[dhms]` needs a letter after digits → fails ✓
- "" → caught by empty check ✓
- " " → stripped is "" → caught by empty check ✓

Looks good. Let me also make sure I handle the case where s is not a string... actually the type hint says `s: str`, so I'll trust that.

One more thing: the `re.findall` on stripped string with spaces - will it still find all the parts? Yes, because it finds all non-overlapping matches of `(\d+)([dhms])` regardless of spaces.

I think this solution is complete and correct.
