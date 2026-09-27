Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` parts
3. Units: d (86400s), h (3600s), m (60s), s (1s)
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Parts can be adjacent or separated by one or more spaces
7. Leading/trailing whitespace allowed
8. No normalization (90m is valid)
9. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. Each part must match `<digits><unit>` where unit is one of d, h, m, s
5. Validate order and no repeats

Let me use regex for parsing each part. A valid part is: `^\d+[dhms]$`

Wait, but I need to be careful. The parts are separated by spaces or written together. So "1h30m" is one token "1h30m" but also valid.

Let me reconsider. The input after stripping whitespace can have parts separated by spaces. But parts can also be adjacent. So I need to handle both cases.

Approach:
1. Strip the string
2. If empty, raise ValueError
3. Split by one or more spaces to get tokens
4. For each token, it could contain multiple parts (like "1h30m")
5. Use regex to find all parts in each token: pattern `(\d+)([dhms])`
6. But I need to make sure the entire token is consumed by these matches (no extra characters)

Actually, let me think more carefully. After splitting by spaces, each token should be entirely composed of `<digits><unit>` sequences. So I can use `re.fullmatch` with a pattern like `(\d+[dhms])+` for each token.

Wait, but I also need to validate that no two consecutive parts have the same unit, and that units are in order d, h, m, s.

Let me refine:

1. Strip whitespace
2. If empty, raise ValueError
3. Split by `\s+` to get tokens
4. For each token, use `re.fullmatch(r'(\d+[dhms])+', token)` - if no match, raise ValueError
5. Extract all (number, unit) pairs from all tokens in order
6. Validate:
   - Units are in correct order (d < h < m < s in terms of position)
   - No repeated units
7. Calculate total seconds

Let me assign order values: d=0, h=1, m=2, s=3

For validation:
- Each unit can appear at most once
- The order must be strictly increasing (d before h before m before s)

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    tokens = s.split()
    
    parts = []
    for token in tokens:
        # Each token must be fully composed of <digits><unit> sequences
        matches = re.findall(r'(\d+)([dhms])', token)
        # Check that the full token is consumed
        reconstructed = ''.join(num + unit for num, unit in matches)
        if reconstructed != token:
            raise ValueError(f"Invalid token: {token}")
        parts.extend(matches)
    
    # Validate order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen_units = set()
    prev_order = -1
    
    for num, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        if unit_order[unit] <= prev_order:
            raise ValueError(f"Wrong order: {unit} after {prev_order}")
        prev_order = unit_order[unit]
    
    # Calculate total
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = 0
    for num, unit in parts:
        total += int(num) * unit_seconds[unit]
    
    return total
```

Wait, I need to be more careful with the regex. What about "123" (number without unit)? The `re.findall` would not match it, and `reconstructed` would be empty, which != "123", so it would raise ValueError. Good.

What about "1.5s"? The regex `(\d+)([dhms])` would match "1" and "s" but not "5". Wait no, `\d+` matches "1", then `[dhms]` needs to match "5" which it won't. So the findall would find no match for "1.5s"... actually let me think again.

`re.findall(r'(\d+)([dhms])', "1.5s")` - this would try to find matches. At position 0: `\d+` matches "1", then `[dhms]` needs to match "." - no. At position 1: "." doesn't match `\d+`. At position 2: `\d+` matches "5", then `[dhms]` matches "s". So it finds [("5", "s")]. Reconstructed = "5s" != "1.5s". So ValueError is raised. Good.

What about "1h2h"? `re.findall` would find [("1","h"), ("2","h")]. Reconstructed = "1h2h" == "1h2h". Then validation catches repeated unit "h". Good.

What about "2h1d"? `re.findall` finds [("2","h"), ("1","d")]. Reconstructed = "2h1d" == "2h1d". Then validation: h has order 1, d has order 0. 0 <= 1, so ValueError. Good.

What about "1hs"? `re.findall` finds [("1","h"), ("", "s")]... wait no. Let me think. `\d+` requires at least one digit. So for "1hs": at position 0, `\d+` matches "1", `[dhms]` matches "h". Then at position 2, `\d+` needs at least one digit but finds "s" - no match. So findall returns [("1","h")]. Reconstructed = "1h" != "1hs". ValueError. Good.

What about uppercase "1H"? `re.findall(r'(\d+)([dhms])', "1H")` - "H" is not in [dhms], so no match. Reconstructed = "" != "1H". ValueError. Good.

What about "  1h  30m  "? Strip gives "1h  30m". Split gives ["1h", "30m"]. Each is valid. Good.

What about "1h-30m"? Split by whitespace gives ["1h-30m"]. `re.findall` on "1h-30m": at pos 0, `\d+`="1", `[dhms]`="h". At pos 2, "-" doesn't match. At pos 3, `\d+`="30", `[dhms]`="m". So matches = [("1","h"), ("30","m")]. Reconstructed = "1h30m" != "1h-30m". ValueError. Good.

I think this solution is correct. Let me also consider: what if the string is just spaces? After strip, it's empty, so ValueError. Good.

One more edge case: "0s" - should be valid, returns 0. Yes, `\d+` matches "0".

I'm satisfied with this solution.
