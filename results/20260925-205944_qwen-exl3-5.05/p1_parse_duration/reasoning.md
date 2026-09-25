Let me carefully analyze the requirements for `parse_duration`:

1. A part is `<non-negative integer><unit>` with NO space between number and unit.
2. Units: d (86400 s), h (3600 s), m (60 s), s (1 s). Lowercase only.
3. Units must appear in order d, h, m, s. Each unit at most once. Any subset is allowed.
4. Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed.
5. No normalization: "90m" is valid (5400).
6. Anything else raises ValueError.

Let me think about the parsing strategy:

- Strip leading/trailing whitespace.
- If empty after stripping, raise ValueError.
- We need to parse parts. Parts can be separated by spaces or written together.
- Each part is `<non-negative integer><unit>`.
- The overall format: after stripping, we need to parse the string as a sequence of parts that may be separated by spaces.

Strategy:
1. Strip the string.
2. If empty, raise ValueError.
3. Remove all spaces? No, that won't work because we need to validate that only spaces are used as separators (not commas, etc.). Actually, the rule says "separated by one or more spaces" - so spaces are the only valid separator. But we also need to reject "other separators".

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." and "Anything else raises ValueError: ... other separators."

So the approach could be:
1. Strip whitespace.
2. If empty, raise ValueError.
3. Remove all spaces from the string (since spaces are only valid as separators between parts, and parts can also be written together). Wait, but we need to make sure that after removing spaces, what remains is a valid sequence of parts.

Actually, let me think more carefully. The valid characters are: digits (0-9), letters (d, h, m, s), and spaces. If there's any other character, it's invalid.

Approach:
1. Strip leading/trailing whitespace.
2. If empty, raise ValueError.
3. Check that the string only contains digits, lowercase letters d/h/m/s, and spaces. If not, raise ValueError.
4. Remove all spaces.
5. Now parse the remaining string as a sequence of `<integer><unit>` parts.
6. Validate: each part has a non-negative integer followed by a unit character.
7. Validate: units are in order d, h, m, s.
8. Validate: no repeated units.
9. Validate: each unit appears at most once.

Wait, but step 3 - what about uppercase letters? "anything else raises ValueError: ... uppercase units". So if we see 'H' or 'D', it should raise ValueError. My check in step 3 would catch that since I only allow lowercase d, h, m, s.

Let me think about parsing the compact string (after removing spaces):
- Use regex or manual parsing.
- Pattern: `(\d+)([dhms])` repeated.
- The entire string must match: `^(\d+[dhms])+$`

But we also need to validate order and no repeats.

Let me use regex: `^(\d+[dhms])+$`

Then extract each part, validate order and uniqueness.

Wait, but what about "0s"? "non-negative integer" - 0 is non-negative, so "0s" should be valid (0 seconds). What about "00s"? That's also a non-negative integer (0). I think leading zeros are fine since it's just a "non-negative integer" representation.

What about "s1"? That's a unit without a number before it - should raise ValueError. My regex would catch this since it requires digits before the unit.

What about "1h2x"? The 'x' is not in [dhms], so step 3 would catch it.

What about "1.5h"? The '.' is not in the allowed characters, so step 3 catches it.

What about "+1h" or "-1h"? The '+' and '-' are not in allowed characters, step 3 catches it.

What about "1 h"? After stripping, it's "1 h". After removing spaces, it's "1h". That's valid. Good.

What about "1  h  30  m"? After removing spaces: "1h30m". Valid.

What about "h1"? Step 3 passes (all chars are valid). After removing spaces: "h1". Regex `^(\d+[dhms])+$` doesn't match. Raise ValueError. Good.

What about "1h1h"? Regex matches. But unit 'h' is repeated. We validate this separately. Good.

What about "30m1h"? Regex matches. But order is wrong (m before h). We validate this separately. Good.

What about "1d2h3m4s"? Valid, order is correct.

What about "1s2d"? Regex matches but order is wrong. Good.

Let me also consider: what about a string like "123"? No unit character. Regex `^(\d+[dhms])+$` doesn't match. Raise ValueError. Good - "number without unit".

What about just "h"? Regex doesn't match (no digits before). Raise ValueError. Good - "missing number".

What about "0"? No unit. Regex doesn't match. Raise ValueError.

What about ""? Empty after strip. Raise ValueError.

What about "   "? Empty after strip. Raise ValueError.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    # Strip leading/trailing whitespace
    s = s.strip()
    
    # Empty or blank string
    if not s:
        raise ValueError("Empty or blank string")
    
    # Check only valid characters: digits, spaces, and lowercase d/h/m/s
    if not re.fullmatch(r'[0-9 dhms]+', s):
        raise ValueError("Invalid characters")
    
    # Remove all spaces
    compact = s.replace(' ', '')
    
    # Must match one or more parts of <digits><unit>
    if not re.fullmatch(r'(\d+[dhms])+', compact):
        raise ValueError("Invalid format")
    
    # Extract parts
    parts = re.findall(r'(\d+)([dhms])', compact)
    
    # Validate order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    prev_order = -1
    
    total = 0
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        seen.add(unit)
        
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Units out of order")
        prev_order = order
        
        total += int(num_str) * multipliers[unit]
    
    return total
```

Wait, I need to be careful with the regex `(\d+[dhms])+`. The `+` on the group means one or more repetitions. But `\d+` inside could be greedy and consume too much... Actually no, `\d+` matches digits and `[dhms]` matches a single letter. Since digits and letters are disjoint, there's no ambiguity. `\d+` will match all consecutive digits, then `[dhms]` must match the next character.

Let me trace through "1h30m":
- First iteration: `\d+` matches "1", `[dhms]` matches "h"
- Second iteration: `\d+` matches "30", `[dhms]` matches "m"
- Full match ✓

"123": 
- `\d+` matches "123", then `[dhms]` needs to match but string is done. No match. ✓ (raises ValueError)

"1h1h":
- First: "1" + "h"
- Second: "1" + "h"
- Full match ✓, but we catch repeated unit later.

Looks good. Let me also make sure the regex `r'(\d+[dhms])+'` works with `re.fullmatch`. Yes, `re.fullmatch` requires the entire string to match.

One more thing: what about tabs, newlines, etc.? The rule says "separated by one or more spaces". So tabs and newlines should NOT be valid separators. My character check `[0-9 dhms]+` only allows literal space characters (ASCII 32), not tabs or newlines. But wait, `s.strip()` strips all whitespace including tabs and newlines. So "1h\t30m" would be stripped to "1h\t30m" (tab is in the middle), and then the character check would fail because tab is not in `[0-9 dhms]`. Good.

Actually wait - `s.strip()` strips leading and trailing whitespace. If the string is "  1h 30m  ", after strip it's "1h 30m". That's fine. If it's "\t1h 30m\t", after strip it's "1h 30m". Fine.

But what about "1h\t30m"? After strip, it's "1h\t30m". The character check `[0-9 dhms]+` doesn't include tab, so it fails. Good.

I think this solution is correct. Let me also consider: what if the input is not a string? The type hint says `s: str`, so I'll assume it's always a string.

Let me also double-check: "0d0h0m0s" → total = 0. Valid.

I'm satisfied with this solution.
