Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` parts
3. Units: d (86400s), h (3600s), m (60s), s (1s)
4. Units must be in order: d, h, m, s (each at most once, any subset allowed)
5. Parts can be together or separated by spaces
6. Leading/trailing whitespace allowed
7. No normalization (90m is valid)
8. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by one or more spaces to get parts
4. Validate each part matches pattern `<digits><unit>` where unit is one of d, h, m, s
5. Check that units are in correct order (d before h before m before s)
6. Check no repeated units
7. Calculate total seconds

Let me think about edge cases:
- "1h 30m" → split by spaces → ["1h", "30m"] → 3600 + 1800 = 5400
- "1h30m" → split by spaces → ["1h30m"] → need to parse this as multiple parts
- Wait, if parts are written together, I need to use regex to find all `<number><unit>` patterns

Actually, let me reconsider. The parts can be written together OR separated by spaces. So:
- "1h30m" is one "token" but contains two parts
- "1h 30m" is two tokens, each one part

I think the best approach is:
1. Strip the string
2. If empty, raise ValueError
3. Check that the string only contains valid characters: digits, d, h, m, s, and spaces
4. Use regex to find all parts: `(\d+)([dhms])`
5. But I also need to make sure the ENTIRE string (after stripping) is accounted for by these parts and spaces

Let me think more carefully. After stripping:
- The string should consist of parts and optional spaces between them
- Each part is `<digits><unit>`

So the regex for the entire string (after strip) should be something like:
`^\d+[dhms](\s*\d+[dhms])*`

Wait, but I also need to validate the order and no repeats.

Let me use a different approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex `(\d+)([dhms])` with `findall` to extract all parts
4. Check that if I reconstruct the string from the found parts and the spaces between them, it matches the original (stripped) string. This ensures no extra characters.

Actually, simpler approach:
1. Strip the string
2. If empty, raise ValueError
3. Use `re.findall(r'(\d+)([dhms])', s)` to get all (number, unit) pairs
4. Use `re.sub(r'\d+[dhms]', '', s)` to remove all valid parts, then check if the remaining is only spaces (or empty). If not, raise ValueError.

Wait, but what about "1h2" - the "2" at the end is a number without a unit. Let me check: `re.findall(r'(\d+)([dhms])', "1h2")` would give `[('1', 'h')]`, and `re.sub(r'\d+[dhms]', '', "1h2")` would give `"2"`, which is not just spaces, so we'd raise ValueError. Good.

What about "1.5h"? `re.findall(r'(\d+)([dhms])', "1.5h")` would give... hmm, `\d+` matches "1", then `[dhms]` needs to match "." which it won't. Then it would try at position 1: "5h" → `('5', 'h')`. So we'd get `[('5', 'h')]`. And `re.sub(r'\d+[dhms]', '', "1.5h")` would give `"1."`. Not just spaces, so ValueError. Good.

What about "-1h"? `re.findall(r'(\d+)([dhms])', "-1h")` → `[('1', 'h')]`. `re.sub(r'\d+[dhms]', '', "-1h")` → `"-"`. Not just spaces, so ValueError. Good.

What about "1H"? `re.findall(r'(\d+)([dhms])', "1H")` → `[]`. `re.sub(r'\d+[dhms]', '', "1H")` → `"1H"`. Not just spaces, so ValueError. Good.

Now for the order check:
- Valid order: d(0), h(1), m(2), s(3)
- Each unit at most once
- Must be in strictly increasing order of their position

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Find all valid parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Check that removing all valid parts leaves only spaces
    remainder = re.sub(r'\d+[dhms]', '', stripped)
    if remainder.strip() != '':
        raise ValueError(f"Invalid duration string: {s}")
    
    # Also check that the remainder is only spaces
    # Actually remainder after removing \d+[dhms] should be only spaces
    # But wait, what if there's a space inside? Like "1 h"?
    # "1 h" → findall gives [] because there's a space between 1 and h
    # Actually no: re.findall(r'(\d+)([dhms])', "1 h") → [] because \d+ is "1" and then [dhms] needs to match " " which fails
    # Wait no, the regex engine will try at each position. At position 0: "1" matches \d+, then " " doesn't match [dhms]. At position 1: " " doesn't match \d+. At position 2: "h" doesn't match \d+.
    # So parts = [] and remainder = "1 h", which strips to "1 h" ≠ "", so ValueError. Good.
    
    if not parts:
        raise ValueError(f"Invalid duration string: {s}")
    
    # Check order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    last_pos = -1
    total = 0
    for num, unit in parts:
        pos = unit_order[unit]
        if pos <= last_pos:
            raise ValueError(f"Units out of order or repeated: {s}")
        last_pos = pos
        total += int(num) * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    return total
```

Wait, I need to also handle the case where `remainder` contains only spaces. Let me check: `re.sub(r'\d+[dhms]', '', "1h 30m")` → `" "`. Then `" ".strip()` → `""`. Good.

But what about `re.sub(r'\d+[dhms]', '', "  1h  30m  ")`? Wait, I already stripped, so this won't happen.

Actually wait - I strip the string first, so leading/trailing spaces are removed. Then the remainder after removing parts should be only internal spaces. Let me verify: `"1h 30m"` → remove `\d+[dhms]` → `" "`. `" ".strip()` → `""`. Good.

What about `"1h  30m"` (two spaces)? → `"  "`. `"  ".strip()` → `""`. Good.

What about `"1h 30m extra"`? → remove parts → `" extra"`. `" extra".strip()` → `"extra"` ≠ `""`. ValueError. Good.

I think this solution is correct. Let me also make sure the `remainder` check handles the case where there are no valid parts at all but the string isn't empty. Like `"abc"` → parts = [], remainder = `"abc"`, strip gives `"abc"` ≠ `""`, ValueError. Good.

And `"0s"` → parts = [("0", "s")], remainder = `""`, valid, returns 0. That seems fine.

What about `"00h"`? parts = [("00", "h")], int("00") = 0. That's fine, it's a non-negative integer.

I think the solution is complete. Let me finalize it.
