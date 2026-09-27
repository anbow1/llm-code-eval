Let me break down the requirements:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. Units must appear in order: d, h, m, s (each at most once)
4. Parts can be separated by spaces or written together
5. Leading/trailing whitespace allowed
6. No normalization (90m = 5400s)
7. Raise ValueError for invalid inputs

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- I need to parse the string character by character or use regex

Let me think about a regex approach:
- The valid pattern would be: optional spaces between parts, each part is digits followed by a unit
- Units must be in order d, h, m, s

Actually, let me think more carefully. The parts are written together or separated by spaces. So I need to:
1. Strip the string
2. If empty, raise ValueError
3. Parse the parts

Let me use a regex approach. The pattern for each part is `\d+[dhms]`. Parts can be separated by spaces.

But I also need to validate:
- Units appear in correct order (d before h before m before s)
- Each unit appears at most once
- No decimals, signs, etc.

Let me think about a regex that matches the entire valid string:
- `^\s*(\d+d)?(\s*)(\d+h)?(\s*)(\d+m)?(\s*)(\d+s)?\s*$`

Wait, but parts can be written together OR separated by spaces. So "1h30m" is valid and "1h 30m" is valid.

So the pattern would be:
- Start with optional whitespace
- Then optionally: digits + 'd'
- Then optionally: optional spaces + digits + 'h'
- Then optionally: optional spaces + digits + 'm'
- Then optionally: optional spaces + digits + 's'
- End with optional whitespace

Let me write the regex:
`^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$`

Wait, but this would allow "1d  2h" (multiple spaces) which should be fine based on "one or more spaces".

But wait - what about "1d2h"? That should be valid (written together). And "1d 2h" should also be valid.

Let me reconsider. The regex `^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$` should work:
- "1d2h" → matches: `1d` then `2h` (no space between)
- "1d 2h" → matches: `1d` then ` 2h` (space between)
- "1d  2h" → matches: `1d` then `  2h`
- "45s" → matches: just `45s`
- "1h30m" → matches: `1h` then `30m`

But wait, what about "1d 2h 3m 4s"? That should work too.

What about edge cases:
- "" → empty, should raise ValueError
- "   " → blank, should raise ValueError
- "1x" → unknown unit
- "h" → missing number
- "12" → number without unit
- "1.5h" → decimal
- "-1h" → sign
- "1H" → uppercase
- "1d1h" → valid
- "1h1d" → wrong order
- "1d1d" → repeated unit

Let me verify my regex handles these:
- "1x" → won't match (x not in dhms) ✓
- "h" → won't match (no digits before h) ✓
- "12" → won't match (no unit) ✓
- "1.5h" → won't match (dot not allowed) ✓
- "-1h" → won't match (minus not allowed) ✓
- "1H" → won't match (uppercase) ✓
- "1h1d" → won't match (h before d violates order) ✓
- "1d1d" → won't match (d appears twice) ✓

Wait, does my regex actually prevent "1h1d"? Let me check: `^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$`

For "1h1d": 
- `(\d+d)?` - could match "1h"? No, it needs to end with 'd'. "1h" doesn't end with 'd'. So this group won't match.
- `(\s*\d+h)?` - could match "1h". Yes!
- `(\s*\d+m)?` - next is "1d", doesn't match 'm'
- `(\s*\d+s)?` - next is "1d", doesn't match 's'
- Then `\s*$` - but we still have "1d" left. So it won't match the full string. ✓

What about "1d1h"? 
- `(\d+d)?` matches "1d"
- `(\s*\d+h)?` matches "1h"
- `(\s*\d+m)?` - nothing left
- `(\s*\d+s)?` - nothing left
- `\s*$` - empty, matches
- Full match! ✓

What about "1d1d"?
- `(\d+d)?` matches "1d"
- `(\s*\d+h)?` - next is "1d", doesn't match 'h'
- `(\s*\d+m)?` - doesn't match
- `(\s*\d+s)?` - doesn't match
- `\s*$` - but "1d" remains. No full match. ✓

Great, the regex handles ordering and repetition correctly.

Now let me also consider: what about "0"? Just "0" with no unit. That should be invalid (number without unit). My regex requires a unit after digits, so "0" won't match. ✓

What about "0h"? That should be valid (0 seconds). My regex: `(\d+h)?` matches "0h". ✓

Let me also think about whether the regex could match something unintended. What about "1dh"? 
- `(\d+d)?` - could match "1d"? Then "h" remains.
- `(\s*\d+h)?` - needs digits before h. "h" has no digits. Won't match.
- So "1dh" won't fully match. ✓

What about "1d h"?
- `(\d+d)?` matches "1d"
- `(\s*\d+h)?` - " h" - `\s*` matches " ", then `\d+` needs digits but finds "h". Won't match.
- So "1d h" won't fully match. ✓

I think the regex approach is solid. Let me code it up.

```python
import re

def parse_duration(s: str) -> int:
    pattern = r'^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$'
    m = re.match(pattern, s)
    if not m:
        raise ValueError(f"Invalid duration: {s!r}")
    
    total = 0
    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    for i, unit in enumerate(['d', 'h', 'm', 's']):
        if m.group(i + 1):
            num_str = m.group(i + 1).replace(unit, '').strip()
            total += int(num_str) * units[unit]
    
    return total
```

Wait, I need to be more careful with extracting the number. The group includes possible leading spaces. Let me use a different approach - use named groups or just extract digits.

Actually, let me restructure. I'll use a cleaner approach:

```python
import re

def parse_duration(s: str) -> int:
    pattern = r'^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$'
    m = re.match(pattern, s)
    if not m:
        raise ValueError(f"Invalid duration: {s!r}")
    
    total = 0
    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    for i, unit in enumerate(['d', 'h', 'm', 's']):
        group = m.group(i + 1)
        if group:
            num_str = re.match(r'\s*(\d+)', group).group(1)
            total += int(num_str) * units[unit]
    
    return total
```

This should work. Let me trace through a few examples:
- "1h30m" → groups: None, "1h", "30m", None → 3600 + 1800 = 5400 ✓
- "1d4s" → groups: "1d", None, None, "4s" → 86400 + 4 = 86404 ✓
- "90m" → groups: None, None, "90m", None → 5400 ✓
- "1h 30m" → groups: None, "1h", " 30m", None → 3600 + 1800 = 5400 ✓

Looks good!
