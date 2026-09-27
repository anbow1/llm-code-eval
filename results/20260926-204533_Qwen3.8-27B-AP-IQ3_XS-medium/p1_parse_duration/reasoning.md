Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<integer><unit>` where unit is d, h, m, or s
3. Units in order: d, h, m, s (each at most once, any subset)
4. Parts can be together or separated by spaces (one or more)
5. Leading/trailing whitespace allowed
6. No normalization
7. Raise ValueError for invalid inputs

Let me think about the parsing strategy:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by spaces? Wait, "separated by one or more spaces" - so I need to handle multiple spaces between parts.
- Actually, let me think more carefully. The parts can be "1h30m" (together) or "1h 30m" (separated by spaces). Multiple spaces allowed.

Approach:
1. Strip the string
2. If empty, raise ValueError
3. I need to find all parts. A part is `<integer><unit>`. Since parts can be together or separated by spaces, I should use regex to find all valid parts.

Let me use a regex approach:
- After stripping, the string should match: one or more parts separated by optional spaces (one or more spaces between parts).
- Actually, the parts themselves don't have spaces (no space between number and unit). Spaces are only separators between parts.

So the pattern would be:
- One or more `<digits><unit>` tokens, where tokens are separated by one or more spaces.
- Or tokens can be adjacent (no space).

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the structure is: parts separated by either nothing or one or more spaces. But not "other separators" - so tabs would be invalid? Let me re-read: "other separators" raises ValueError. So only spaces (not tabs) are valid separators.

Wait, but leading/trailing whitespace - does that include tabs? The problem says "Leading/trailing whitespace is allowed." I'll assume whitespace means spaces (and maybe tabs?). Actually, let me be careful. The problem says "separated by one or more spaces" and "other separators" are invalid. I think leading/trailing whitespace means spaces. Let me just use `.strip()` which handles all whitespace for leading/trailing, but for the separators between parts, only spaces are valid.

Hmm, actually let me reconsider. "Leading/trailing whitespace is allowed" - I'll use `.strip()` for that. For between parts, only spaces (one or more).

Let me think about the regex:
- A part: `\d+[dhms]`
- Parts separated by ` *` (zero or more spaces) between them, but at least one part.
- The overall pattern: `\d+[dhms](?: *\d+[dhms])*`

Wait, but I need to validate:
- Units in order: d, h, m, s
- Each unit at most once
- No missing numbers, no decimals, no signs, no uppercase

Let me use a regex to find all parts first:
- Pattern: `(\d+)([dhms])`
- But I need to make sure the entire string (after stripping) is composed of these parts with only spaces between them.

Better approach:
1. Strip the string
2. If empty, raise ValueError
3. Use a regex to match the entire string: `^(?:\d+[dhms])(?: +\d+[dhms])*$`
   - Wait, this requires spaces between parts. But parts can also be together.
   - Actually: `^(?:\d+[dhms])(?: *\d+[dhms])*$` - this allows zero or more spaces between parts.
   
   But wait, if there are zero spaces, the parts are together. If one or more spaces, they're separated. The regex `(?:\d+[dhms])(?: *\d+[dhms])*` handles both cases.

   But I need to make sure there aren't "other separators". If I use the regex to match the entire string, and it only allows digits, dhms, and spaces, then any other character would fail the match.

   Let me verify: "1h 30m" → parts are "1h" and "30m". The regex: `^(?:\d+[dhms])(?: *\d+[dhms])*$`
   - First part: `1h` matches `\d+[dhms]`
   - Then ` 30m` matches ` *\d+[dhms]` (one space, then 30m)
   - Good.

   "1h30m" → `1h` then `30m` (zero spaces between). Matches.
   
   "1d  4s" → `1d` then `  4s` (two spaces). Matches.
   
   "1h  30m " → after strip, "1h  30m". Matches.
   
   "1h 30" → `1h` then ` 30`... `30` doesn't match `[dhms]`. Fails. Good.
   
   "1h 30x" → `1h` then ` 30x`... `x` not in `[dhms]`. Fails. Good.
   
   "1h 30m2s" → `1h` then ` 30m` then `2s`. Wait, ` *\d+[dhms]` - after `1h`, we have ` 30m2s`. The first ` *\d+[dhms]` would match ` 30m`, then the next `(?: *\d+[dhms])*` would try to match `2s`. ` *` matches zero spaces, `2s` matches `\d+[dhms]`. Good.

   But wait, what about "1h 30m2s"? Is that valid? The "2s" is attached to "30m" without a space. According to the rules, parts may be written together. So "30m2s" means "30m" and "2s" are together. That should be valid.

   What about "1h30m 2s"? That's "1h30m" (together) then space then "2s". The regex: `1h` matches first part. Then `30m` matches ` *\d+[dhms]` (zero spaces). Then ` 2s` matches ` *\d+[dhms]` (one space). Good.

4. After matching, extract all (number, unit) pairs using `re.findall` or `re.finditer`.
5. Validate:
   - Units are in correct order (d before h before m before s)
   - No repeated units
6. Calculate total seconds.

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Match the entire string pattern
    if not re.fullmatch(r'(?:\d+[dhms])(?: *\d+[dhms])*', s):
        raise ValueError("Invalid format")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    if not parts:
        raise ValueError("No parts found")
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    last_order = -1
    seen_units = set()
    
    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        
        if unit_order[unit] < last_order:
            raise ValueError(f"Wrong order: {unit}")
        
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. What about leading zeros? "007h" - is that valid? The rules say "non-negative integer" so 007 is a valid integer. `\d+` would match it. That's fine.

What about "0s"? That's valid - 0 seconds.

What about empty parts? Can't happen because `\d+` requires at least one digit and `[dhms]` requires one unit char.

Let me also think about: "1h  30m" with multiple spaces - the regex ` *` handles that.

What about "1h\t30m"? Tab is not a space. The regex ` *` won't match a tab. So `re.fullmatch` would fail. Good.

What about "1h  30m\t2s"? After "30m", we have `\t2s`. The regex expects ` *\d+[dhms]` but `\t` doesn't match ` *`. So the fullmatch fails. Good.

Actually wait - I need to be more careful. Let me trace through "1h 30m":
- `re.fullmatch(r'(?:\d+[dhms])(?: *\d+[dhms])*', "1h 30m")`
- `(?:\d+[dhms])` matches "1h"
- `(?: *\d+[dhms])*` tries to match " 30m": ` *` matches " ", `\d+` matches "30", `[dhms]` matches "m". 
- Remaining string is empty. Full match! Good.

"1h30m":
- `(?:\d+[dhms])` matches "1h"
- `(?: *\d+[dhms])*` tries "30m": ` *` matches "" (zero spaces), `\d+` matches "30", `[dhms]` matches "m".
- Remaining is empty. Full match! Good.

"2d":
- `(?:\d+[dhms])` matches "2d"
- No more. Full match! Good.

"45s":
- `(?:\d+[dhms])` matches "45s"
- Full match! Good.

"1d4s":
- `(?:\d+[dhms])` matches "1d"
- `(?: *\d+[dhms])*` matches "4s" (zero spaces)
- Full match! Good.

"90m":
- `(?:\d+[dhms])` matches "90m"
- Full match! Good.

"1H" → `[dhms]` is lowercase only, so "H" won't match. Full match fails. Good.

"1h 30" → After "1h", remaining is " 30". ` *` matches " ", `\d+` matches "30", but then `[dhms]` needs to match... there's nothing left. Fails. Good.

"1h2h" → After "1h", "2h": ` *` matches "", `\d+` matches "2", `[dhms]` matches "h". So parts are [("1","h"), ("2","h")]. Then we'd catch repeated unit "h". Good.

"1h1d" → Parts: [("1","h"), ("1","d")]. Order: h is 1, d is 0. 0 < 1, so wrong order. Good.

"1.5h" → `\d+` would match "1", then `[dhms]` needs to match ".". Fails. Good. Actually wait: `\d+` matches "1", then `[dhms]` tries to match "." - no. So the regex fails at the first part. Full match fails. Good.

"1h 30m " → after strip: "1h 30m". Same as before. Good.

"  " → after strip: "". Empty check catches it. Good.

I think this solution is correct. Let me also make sure I handle the edge case where the string is just whitespace - strip makes it empty, and we raise ValueError.

One more thing: the problem says "Any subset is allowed" - so just "45s" is valid, just "1h" is valid, etc. My code handles that since I don't require all units.

Let me finalize the code.
