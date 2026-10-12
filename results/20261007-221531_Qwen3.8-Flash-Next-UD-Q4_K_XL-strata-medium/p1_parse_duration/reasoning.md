Let me carefully analyze the requirements for `parse_duration`:

1. A duration string consists of parts: `<non-negative integer><unit>`
2. Units: d (86400), h (3600), m (60), s (1) - lowercase only
3. Units must appear in order: d, h, m, s
4. Each unit at most once
5. Parts can be together ("1h30m") or separated by spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization ("90m" is valid)
8. Raises ValueError for:
   - Empty or blank string
   - Unknown unit
   - Wrong order
   - Repeated unit
   - Missing number
   - Number without unit
   - Decimals
   - Signs (+/-)
   - Uppercase units
   - Other separators (like commas, colons, etc.)

Let me think about parsing strategy:

Approach: Use regex to tokenize the string, then validate the sequence.

A part looks like: one or more digits followed by one of d, h, m, s.

But I need to be careful:
- "1h30m" should parse as "1h" and "30m"
- "1h 30m" should also work
- "90m" is valid
- "0d" is valid (non-negative integer includes 0)
- Leading zeros? "01h" - probably valid since it's still a non-negative integer representation
- "0" without unit is invalid
- "-1h" invalid (signs)
- "1.5h" invalid (decimals)
- "1H" invalid (uppercase)
- "1h,30m" invalid (other separators)

Strategy:
1. Strip leading/trailing whitespace
2. Check it's not empty
3. Tokenize using regex that matches `<digits><unit>` where unit is d/h/m/s
4. Ensure the entire string is consumed by these tokens (with optional spaces between them)
5. Validate order and uniqueness

Let me think about the regex approach:

I can match the whole string against a pattern like:
`^\s*(?:\d+[dhms])(?:\s*\d+[dhms])*\s*$`

But this doesn't validate order or uniqueness. I need to extract the parts and validate them.

Let me use a regex to find all matches of `\d+[dhms]` and then check:
- The total number of characters in all matches + spaces between them equals the stripped string length
- The units are in correct order
- No repeated units

Actually, let me think more carefully. The separators between parts can be "one or more spaces". Between parts there's no separator needed ("1h30m") or one/more spaces ("1h 30m").

So the pattern is: `(optional spaces)(digit+)(unit)(optional spaces between parts)...`

Let me use `re.findall` to get all `\d+[dhms]` tokens, then verify the string is fully covered by these tokens and spaces.

Better approach: use `re.fullmatch` or `re.match` to validate structure, then extract parts.

Let me think about edge cases:
- "123" - digits without unit → invalid
- "h" - unit without digits → invalid
- "1H" - uppercase → invalid
- "1h2h" - repeated unit → invalid
- "2h1d" - wrong order → invalid
- "1,2h" - other separator → invalid
- "1 h" - space between number and unit → invalid (NO space between number and unit)
- "1.5h" - decimal → invalid
- "-1h" - sign → invalid

Let me write the regex for a valid full string:
`^\s*(\d+[dhms]\s*)*$` but this is too permissive (allows empty).

Better:
`^\s*(\d+[dhms](\s*)\d+[dhms]\s*)*\d+[dhms]\s*$`

Actually, let me just use a regex to tokenize and then validate:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty string")
    
    # Tokenize: find all occurrences of \d+[dhms]
    pattern = re.compile(r'(\d+)([dhms])')
    
    pos = 0
    parts = []
    while pos < len(stripped):
        # Skip spaces
        while pos < len(stripped) and stripped[pos] == ' ':
            pos += 1
        if pos >= len(stripped):
            break
        
        # Match a part
        m = pattern.match(stripped, pos)
        if not m:
            raise ValueError(f"Invalid character at position {pos}")
        num_str, unit = m.group(1), m.group(2)
        parts.append((int(num_str), unit))
        pos = m.end()
    
    if not parts:
        raise ValueError("No valid parts")
    
    # Validate order and uniqueness
    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen_units = set()
    prev_order = -1
    
    for num, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        if order[unit] <= prev_order:
            raise ValueError(f"Wrong order: {unit}")
        prev_order = order[unit]
    
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = sum(num * multipliers[unit] for num, unit in parts)
    return total
```

Wait, I need to be more careful. After matching a part like "1h", the next character should be either a space or a digit (start of next part). If it's anything else (like a comma, or an uppercase letter), it should raise ValueError.

Actually, my loop handles this: after matching a part, we go back to the top, skip spaces, then try to match another part. If there's a non-space, non-digit character, `pattern.match` will fail and we raise ValueError.

But wait - what about "1H"? The pattern `[dhms]` won't match 'H', so after matching "1" as... no wait, the pattern is `(\d+)([dhms])` which requires BOTH digits AND a valid unit. If we have "1H", the regex won't match at all because 'H' is not in `[dhms]`. So `pattern.match` returns None and we raise ValueError. Good.

What about "123" (digits without unit)? The pattern requires a unit character after digits, so it won't match. `pattern.match` returns None. Good.

What about "h" (unit without digits)? Same, won't match. Good.

What about "1h2s1m"? After parsing "1h" and "2s", we try to match "1m". But then order check: 's' has order 3, 'm' has order 2, so 2 <= 3 is False... wait, prev_order would be 3 (from 's'), and order['m'] is 2, so 2 <= 3 is True → raises ValueError. Good.

What about "1h  30m" (multiple spaces)? My loop skips multiple spaces. Good.

What about "1 h" (space between number and unit)? The pattern `(\d+)([dhms])` requires the unit immediately after digits. So "1 " won't match because the space isn't in `[dhms]`. Actually wait - `(\d+)([dhms])` applied to "1 h" starting at position 0: it would match "1" for `\d+` but then expects `[dhms]` at position 1 which is a space. So it fails. Good.

Hmm, but what about "01h"? `\d+` matches "01", unit is 'h'. That's fine - "01" is a valid representation of a non-negative integer. The spec says "non-negative integer" which I think allows leading zeros.

What about "0h"? Non-negative integer includes 0. Valid.

What about an empty string after strip? I check for that.

What about "1h\n30m"? The spec says "one or more spaces" as separators. I'm only skipping spaces, not other whitespace. Should I? The spec says "separated by one or more spaces" and "Leading/trailing whitespace is allowed". I think for separators, only spaces (not tabs/newlines) are allowed. And for leading/trailing, whitespace (including tabs) is allowed via `.strip()`. Let me keep my implementation as is - `.strip()` handles leading/trailing whitespace, and between parts I only skip spaces.

Actually, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So between parts: only spaces (not tabs). Leading/trailing: whitespace. My implementation does `.strip()` for leading/trailing and only skips spaces between parts. Good.

Let me also consider: what if the string is just spaces? After strip it's empty → ValueError. Good.

I think this solution is correct. Let me finalize it.
