Let me analyze the requirements carefully:

1. Parse a duration string like "2d", "1h30m", "45s", "1d4s", "1h 30m"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Order must be d, h, m, s (each at most once)
4. Parts can be together or separated by spaces
5. No spaces between number and unit
6. Leading/trailing whitespace allowed
7. "90m" is valid (no normalization needed)
8. Invalid: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

- Strip leading/trailing whitespace
- Check if empty after strip → ValueError
- Split into tokens. But wait - parts can be written together ("1h30m") or separated by spaces. So I can't just split by spaces because "1h30m" has no space.
- I need to parse character by character or use regex.

Let me use regex to find all valid parts:
- A part is `<non-negative integer><unit>` where unit is one of d, h, m, s
- Non-negative integer means digits (0-9), at least one digit, no leading zeros? Actually the problem says "non-negative integer" - I think 0 is valid, and something like "05" might be... let me re-read.

Actually, re-reading: "missing number, number without unit, decimals, signs, uppercase units, other separators" - these are things that raise ValueError.

So valid number: one or more digits (0-9). Can it have leading zeros? The problem says "non-negative integer" - I'll allow "0", "00", "05" etc. Actually, let me think... "05m" - is that valid? The problem says "non-negative integer" which could be "05". But typically in parsing, leading zeros might be considered invalid. Let me re-read the constraints.

The problem says: "A part is <non-negative integer><unit>" - I think "0" is valid, and "05" could be valid too. But let me be careful. Actually, I'll allow any sequence of digits (at least one) as the number. So "0", "5", "05", "100" are all valid numbers.

Wait, but what about "0"? "0s" should be valid and give 0 seconds.

Let me think about the parsing strategy:

1. Strip the string. If empty, raise ValueError.
2. Use regex to extract all tokens. The valid pattern for a token is `\d+[dhms]`.
3. But I also need to validate that the entire string is composed ONLY of valid tokens separated by optional spaces.

Let me think more carefully. The string after stripping should consist of:
- One or more parts
- Each part is `\d+[dhms]`
- Parts are either adjacent or separated by one or more spaces
- No other characters allowed

So the overall pattern would be: `^\d+[dhms](\s*\d+[dhms])*$` but wait, the spaces between parts... Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the valid format after strip is: `\d+[dhms](\s+\d+[dhms])*` OR `\d+[dhms](\d+[dhms])*` ... actually combining: `\d+[dhms](\s*\d+[dhms])*`

Wait, but "one or more spaces" means if there are spaces, there must be at least one. So `\s*` would allow zero spaces (together) or any number. But the spec says "separated by one or more spaces" - so if there's separation, it's one or more spaces. But together means zero spaces. So `\s*` works: zero spaces (together) or one or more spaces.

Actually, let me reconsider. The regex `^\d+[dhms](\s*\d+[dhms])*$` should work. Let me verify:
- "2d" → matches `\d+[dhms]` = "2d", then nothing after. ✓
- "1h30m" → "1h" then "30m" (zero spaces between). ✓
- "1h 30m" → "1h" then " 30m" (one space). ✓
- "1h  30m" → "1h" then "  30m" (two spaces). ✓
- " 2d " → after strip, "2d". ✓
- "45s" → "45s". ✓
- "1d4s" → "1d" then "4s". ✓

Now for validation:
- After stripping, check if empty → ValueError
- Try to match the regex. If no match → ValueError
- Extract all (number, unit) pairs
- Check order: d, h, m, s - each at most once
- If any unit appears more than once → ValueError
- If order is wrong (e.g., "30m1h") → ValueError
- Compute total seconds

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Match the overall pattern
    match = re.fullmatch(r'\d+[dhms](\s*\d+[dhms])*', stripped)
    if not match:
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Extract all (number, unit) pairs
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Validate order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    seen_units = set()
    total = 0
    
    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order")
        prev_order = order
        
        total += int(num_str) * unit_values[unit]
    
    return total
```

Wait, I need to double-check the regex. The fullmatch with `\d+[dhms](\s*\d+[dhms])*` - does this correctly reject things like:
- "1h30m extra" → no, "extra" won't match
- "12.5m" → no, `\d+` won't match "12.5"
- "-5m" → no, `-` isn't in `\d`
- "1H" → no, uppercase
- "1x" → no, unknown unit
- "" → handled by empty check
- "  " → handled by empty check after strip
- "1 2" → `\d+[dhms]` requires a unit after digits. "1 2" - the first part would need "1" followed by a unit char. "1" followed by " " - space isn't in [dhms]. So this won't match. ✓
- "1d 2h 3" → "3" at the end has no unit, won't match. ✓

What about "0"? After strip, it's "0". The regex requires at least one digit followed by a unit. "0" alone won't match. Good - that's "number without unit" → ValueError.

What about "0s"? → matches, gives 0. Valid.

What about "00s"? → `\d+` matches "00", unit "s". Gives 0. I think this is fine - it's a valid non-negative integer representation.

Actually wait - should "00" be considered valid? The problem says "non-negative integer". "00" is technically 0. I'll allow it since the regex `\d+` allows it and the problem doesn't specifically forbid leading zeros.

Let me also consider: what about a string with just spaces between valid parts but no content? Like " " - after strip it's empty, handled. What about "1d " - after strip it's "1d", valid. What about " 1d 30m " - after strip "1d 30m", valid.

I think my solution is correct. Let me also make sure the `re.fullmatch` approach handles everything correctly.

Actually, I realize I should double-check: does `\s*` in the regex allow tabs and newlines? The problem says "separated by one or more spaces". Does "spaces" mean only space character, or any whitespace? The problem says "one or more spaces" specifically. But it also says "Leading/trailing whitespace is allowed." 

Hmm, I think for safety, I should use `[ ]*` (literal space) for the separators between parts, and `strip()` for leading/trailing whitespace (which handles all whitespace). Actually, let me re-read: "separated by one or more spaces". I'll interpret "spaces" literally as the space character. But actually, in most parsing contexts, whitespace is used interchangeably. Let me use `\s*` which handles spaces, tabs, etc. But wait - the problem says "other separators" raise ValueError. So if someone uses a tab between parts, is that an "other separator"? 

I think "spaces" in the problem means the space character specifically. Let me use ` *` (zero or more space characters) for the separator. Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

I'll use spaces specifically. For leading/trailing, I'll use `.strip()` which removes all whitespace (including tabs, newlines). For internal separators, I'll use space characters only.

Wait, but what if someone writes "1d\t30m"? Is that valid? The problem says "separated by one or more spaces" and "other separators" are invalid. A tab is not a space, so it would be an "other separator" → ValueError.

Let me adjust: use ` *` (literal spaces) for internal separators.

Actually, let me reconsider. The regex for the full string (after strip) should be:
`\d+[dhms]( *\d+[dhms])*`

This means: a part, then optionally (spaces + another part), repeated.

Let me test:
- "1h30m" → "1h" + "30m" (zero spaces). ✓
- "1h 30m" → "1h" + " 30m" (one space). ✓
- "1h  30m" → "1h" + "  30m" (two spaces). ✓
- "1h\t30m" → "1h" + "\t30m" - tab is not a space, won't match. ✓ (ValueError)
- "1h,30m" → won't match. ✓ (ValueError)

Good. Let me finalize:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    pattern = r'\d+[dhms]( *\d+[dhms])*'
    if not re.fullmatch(pattern, stripped):
        raise ValueError(f"Invalid duration string: {s!r}")
    
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    seen_units = set()
    total = 0
    
    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError("Wrong unit order")
        prev_order = order
        
        total += int(num_str) * unit_values[unit]
    
    return total
```

This looks good. Let me trace through a few examples:
- "2d" → parts: [("2","d")] → 2*86400 = 172800. ✓
- "1h30m" → parts: [("1","h"),("30","m")] → 3600 + 1800 = 5400. ✓
- "45s" → parts: [("45","s")] → 45. ✓
- "1d4s" → parts: [("1","d"),("4","s")] → 86400 + 4 = 86404. ✓
- "90m" → parts: [("90","m")] → 5400. ✓
- "1h 30m" → parts: [("1","h"),("30","m")] → 5400. ✓
- "" → ValueError. ✓
- "  " → strip → "" → ValueError. ✓
- "30m1h" → regex matches (30m then 1h), but order check: m=2, then h=1, 1<=2 → ValueError. ✓
- "1h2h" → regex matches, repeated unit h → ValueError. ✓
- "12.5m" → regex won't match (dot not allowed) → ValueError. ✓
- "-5s" → regex won't match → ValueError. ✓
- "1H" → regex won't match (uppercase) → ValueError. ✓
- "1 2" → regex won't match (no unit) → ValueError. ✓
- "1d 30m" → parts: [("1","d"),("30","m")] → 86400+1800 = 88200. ✓

I'm satisfied with this solution.
