Let me analyze the requirements carefully:

1. Parse a duration string to total seconds
2. Format: `<non-negative integer><unit>` with NO space between number and unit
3. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
4. Units must appear in order d, h, m, s. Each unit at most once. Any subset allowed.
5. Parts may be together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace allowed.
6. No normalization: "90m" is valid.
7. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Let me think about the parsing approach:

- First, strip whitespace. If empty after stripping, raise ValueError.
- Split by whitespace to get tokens (but actually, parts can be concatenated like "1h30m", so I need a different approach).

Better approach: Use regex or manual parsing to extract tokens.

Actually, let me think about this more carefully. The parts can be:
- "1h30m" - no separator between parts
- "1h 30m" - separated by spaces
- "1h  30m" - multiple spaces

So the strategy could be:
1. Strip the string. If empty, raise ValueError.
2. Split by one or more spaces to get individual tokens.
3. For each token, it might be a single part like "1h" or a concatenated sequence like "1h30m".

Wait, actually let me reconsider. If I split by spaces, then "1h 30m" gives me ["1h", "30m"], and "1h30m" gives me ["1h30m"]. So I need to parse each token to potentially extract multiple parts from it.

Let me use a regex approach:
- Find all matches of the pattern `(\d+)([dhms])` in the string.
- Then verify that:
  - The matched substrings, when concatenated with any non-matching characters between them, only consist of digits, units, and whitespace.
  - Actually, I need to verify there's nothing else in the string besides the valid parts and whitespace.

Let me think about this differently. I'll use a comprehensive regex:

Pattern: `^\s*(?:(\d+)([dhms])\s*)*$`

But I also need to validate:
- Order: d, h, m, s
- Each unit at most once
- No empty string
- No other characters

Let me use a full-match regex approach:

```python
import re

def parse_duration(s: str) -> int:
    # Try to match the entire string with valid format
    # Valid format: optional whitespace, then one or more parts (each being digits followed by a unit), 
    # parts separated by optional whitespace
    
    pattern = r'^\s*(?:(\d+)([dhms])\s*)+$'
    match = re.fullmatch(pattern, s)
    if not match:
        raise ValueError(...)
    
    # Extract all parts
    parts = list(re.finditer(r'(\d+)([dhms])', s))
    
    # Validate order and no repeats
    unit_multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = ['d', 'h', 'm', 's']
    
    last_order = -1
    total = 0
    seen_units = set()
    
    for m in parts:
        num = int(m.group(1))
        unit = m.group(2)
        if unit in seen_units:
            raise ValueError(...)
        order = unit_order.index(unit)
        if order <= last_order:
            raise ValueError(...)
        seen_units.add(unit)
        last_order = order
        total += num * unit_multipliers[unit]
    
    return total
```

Wait, the regex `r'^\s*(?:(\d+)([dhms])\s*)+$'` - let me check if this works:
- "1h30m" → matches: "1h" then "30m" with no space between ✓
- "1h 30m" → matches: "1h " then "30m" ✓
- "1h  30m" → matches: "1h  " then "30m" ✓
- " 1h30m " → matches: " " then "1h30m" then " " ✓
- "abc" → doesn't match ✓
- "1x" → doesn't match (x not in [dhms]) ✓
- "1H" → doesn't match ✓
- "1.5h" → doesn't match ✓
- "+1h" → doesn't match ✓
- "-1h" → doesn't match ✓
- "" → doesn't match (need at least one part due to +) ✓
- "   " → doesn't match ✓
- "12" → doesn't match (number without unit) ✓
- "h" → doesn't match (unit without number) ✓

Hmm, wait. What about "12" (number without unit)? The regex requires a unit after digits, so "12" alone won't match. Good.

What about "123456789012345678901234567890h"? That's a very large number. Should that be valid? The problem says "non-negative integer" so I think arbitrarily large integers should be fine. Python handles big ints natively.

What about "0h"? Non-negative integer, so 0 is valid. "0h" → 0 seconds. That seems fine.

What about "00h"? That's a valid non-negative integer representation (0). I'll allow it.

Let me also think about edge cases:
- "1h1h" → repeated unit → should raise ValueError
- "1h1m1h" → wrong order AND repeated → should raise ValueError
- "1h1s1m" → wrong order → should raise ValueError

The regex would match "1h1h" and "1h1m1h" and "1h1s1m" (they match the format pattern), but then my validation loop would catch the errors.

Wait, but for "1h1h", the regex `r'(\d+)([dhms])'` with finditer would find "1h" and "1h". Then in validation, unit "h" is seen twice → ValueError. Good.

For "1h1s1m", the regex would find "1h", "1s", "1m". In validation: h (order 1), s (order 3), m (order 2). Since 2 <= 3, wrong order → ValueError. Good.

Let me also make sure the regex doesn't accidentally match things like "12abc34" - the regex requires the ENTIRE string to match, so "12abc34" would not match because "abc" is not in [dhms] and not whitespace. Good.

What about "1h2x3m"? The regex wouldn't match because "2x" doesn't fit the pattern. Good.

I think this approach is solid. Let me write the final solution.

Actually, wait - I need to double-check: the regex `r'^\s*(?:(\d+)([dhms])\s*)+$'` - does `\s*` at the end of each part allow trailing spaces? Yes. And `\s*` at the beginning allows leading spaces. Good.

But wait, what about "1h  2m  " - trailing spaces after the last part? The pattern `(\d+)([dhms])\s*` allows trailing whitespace after each part. The outer `^\s*` handles leading whitespace. So " 1h 2m " would work. Let me verify:
- `^\s*` matches " "
- `(\d+)([dhms])\s*` matches "1h " (with one space)
- `(\d+)([dhms])\s*` matches "2m " (with one space)
- `$` - wait, does `$` come after the last `\s*`? Let me re-read: `(?:(\d+)([dhms])\s*)+` - the `\s*` is part of each repetition. So after "2m" there can be `\s*` which matches " ", then the repetition ends, and `$` matches end of string. Yes, this works.

Actually, let me re-examine: `^\s*(?:(\d+)([dhms])\s*)+$`

For " 1h 2m ":
- `^\s*` → matches " "
- First repetition of `(?:...)` → `(\d+)([dhms])\s*` → "1h " (digits=1, unit=h, whitespace=" ")
- Second repetition → `(\d+)([dhms])\s*` → "2m " (digits=2, unit=m, whitespace=" ")
- `$` → end of string ✓



For "1h30m":
- `^\s*` → matches "" (empty)
- First repetition → "1h" (digits=1, unit=h, whitespace="")
- Second repetition → "30m" (digits=30, unit=m, whitespace="")
- `$` → end of string ✓



One more thought: what about the string "0"? Just "0" with no unit. The regex requires a unit after digits, so "0" won't match → ValueError. Good.

What about "1h0m0s"? That's valid - each unit once, in order. Total = 3600. The regex matches, and validation passes. Good.

Let me write the final clean solution.
