Let me analyze the requirements:

1. Parse a duration string like "1d4s", "1h 30m", "45s", etc.
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order d, h, m, s - each at most once
4. Parts can be together or separated by spaces
5. No normalization (90m is valid)
6. Raise ValueError for various invalid inputs

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by spaces to get parts, OR use regex to find all tokens
- Actually, the tricky part is that parts can be together ("1h30m") or separated by spaces. So I need to use regex to find all `<number><unit>` patterns.

Let me think about this more carefully:
- "1h 30m" → parts: "1h", "30m"
- "1h30m" → parts: "1h", "30m"
- "  1h  30m  " → parts: "1h", "30m"

So I should use regex to find all occurrences of `\d+[dhms]` in the string.

But I also need to validate that the ENTIRE string (after stripping whitespace) is composed of these tokens separated by optional spaces. So I should check that the regex matches cover the entire string (excluding leading/trailing whitespace).

Let me use a regex approach:
- `^\s*(\d+[dhms])(\s*\d+[dhms])*\s*$` - this would match valid strings

Actually, let me think about what constitutes an invalid string:
- "1h2d" - wrong order (h before d)
- "1d1d" - repeated unit
- "1h30" - number without unit
- "1h 30" - number without unit (the "30" at the end)
- "1.5h" - decimals
- "-1h" - sign
- "1H" - uppercase
- "" - empty
- "   " - blank
- "1h-x" - other separators
- "h1" - missing number before unit? Actually "h" alone would be unknown unit or missing number.

Wait, "1h30" - the "30" is a number without a unit. How do I detect this?

I think the best approach is:
1. Strip the string
2. If empty, raise ValueError
3. Use `re.findall(r'\d+[dhms]', s)` to find all valid tokens
4. Use `re.sub(r'\d+[dhms]', '', s)` to remove all valid tokens, then check if only whitespace remains
5. Validate the tokens are in correct order and no unit repeats

Wait, but "1h30" - findall would give ["1h"], and after sub we'd have "30" which is not whitespace, so it would fail. Good.

"1.5h" - findall would give... let's see. `\d+[dhms]` would match "1" then... no wait, "1.5h" - `\d+[dhms]` would try to match: at position 0, "1" matches `\d+`, then it needs `[dhms]` but gets "." - fail. At position 1, "." doesn't match `\d+`. At position 2, "5" matches `\d+`, then "h" matches `[dhms]` - so it matches "5h". After sub, we'd have "1." which is not whitespace. Good, it would fail.

Wait, actually let me reconsider. "1.5h" - the regex `\d+[dhms]` scanning:
- Position 0: try `\d+` matches "1", then `[dhms]` needs to match "." - fail
- Position 1: "." - `\d+` needs at least one digit - fail
- Position 2: "5" matches `\d+`, then "h" matches `[dhms]` - match "5h"
- Position 4: end

So findall gives ["5h"], sub gives "1." which has non-whitespace chars. Good.

What about "12h"? findall: "12h" matches. sub gives "". Good, valid.

What about "0h"? Should be valid (0 seconds). "0" is a non-negative integer.

What about just "h"? findall: no match (need `\d+` first). sub: "h" remains. Invalid. Good.

What about "1h2h"? findall: ["1h", "2h"]. After sub: "". But we have repeated unit 'h'. So we check for repeated units. Good.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty string")
    
    # Find all valid tokens
    tokens = re.findall(r'(\d+)([dhms])', stripped)
    
    # Check that the entire string is composed of tokens separated by whitespace
    # Remove all valid tokens and check remainder is only whitespace
    remainder = re.sub(r'\d+[dhms]', '', stripped)
    if remainder.strip():
        raise ValueError("Invalid format")
    
    if not tokens:
        raise ValueError("No valid duration parts")
    
    # Check order and duplicates
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen_units = []
    total = 0
    last_order = -1
    
    for num_str, unit in tokens:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("Wrong order or repeated unit")
        last_order = order
        seen_units.append(unit)
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check: "1h 30m" - stripped is "1h 30m". findall: [("1","h"), ("30","m")]. sub: " " (the space). " ".strip() is "" - good, no error.

"1h30m" - stripped is "1h30m". findall: [("1","h"), ("30","m")]. sub: "". Good.

"  1h  30m  " - stripped is "1h  30m". Same as above. Good.

"1h  30m" - stripped is "1h  30m". findall: [("1","h"), ("30","m")]. sub: "  " (two spaces). "  ".strip() is "". Good.

What about "1h-30m"? stripped: "1h-30m". findall: [("1","h"), ("30","m")]. sub: "-". "-".strip() is "-". Not empty, so ValueError. Good.

What about "1 h30m"? stripped: "1 h30m". findall: [("1","h")? No wait... let me re-examine. "1 h30m":
- Position 0: "1" matches `\d+`, then " " needs to match `[dhms]` - fail
- Position 1: " " - fail
- Position 2: "h" - `\d+` needs a digit - fail
- Position 3: "3" matches `\d+`, "0" also matches `\d+`, then "m" matches `[dhms]` - match "30m"
- Position 6: end

findall: [("30","m")]. sub: "1 h". "1 h".strip() is "1 h". Not empty. ValueError. Good.

What about "1h m"? stripped: "1h m". findall: [("1","h")]. sub: " m". " m".strip() is "m". Not empty. ValueError. Good.

What about "0"? stripped: "0". findall: []. remainder: "0".strip() = "0". Not empty. ValueError. Good (number without unit).

What about "1d4s"? findall: [("1","d"), ("4","s")]. Orders: 0, 3. 0 < 3, so OK. Total: 86400 + 4 = 86404. Good.

What about "1s4d"? findall: [("1","s"), ("4","d")]. Orders: 3, 0. 0 <= 3, so ValueError. Good.

What about "1d1h1m1s"? Orders: 0,1,2,3. All increasing. Good.

What about "1d1d"? Orders: 0,0. 0 <= 0, ValueError. Good.

I think this solution is correct. Let me also consider edge cases:
- Very large numbers: "999999999999d" - should work fine with Python's int.
- "0s" - valid, returns 0.
- "0" - invalid (no unit).

I think the solution is solid. Let me finalize it.
