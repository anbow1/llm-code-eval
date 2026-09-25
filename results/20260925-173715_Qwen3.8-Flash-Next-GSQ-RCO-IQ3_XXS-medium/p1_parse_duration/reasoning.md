Let me carefully analyze the requirements:

1. Parse a duration string into total seconds
2. Parts: `<non-negative integer><unit>` with NO space between number and unit
3. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Parts may be together ("1h30m") or separated by spaces ("1h 30m")
7. Leading/trailing whitespace allowed
8. No normalization: "90m" is valid
9. ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

I'll use regex to parse the string. Let me think about what constitutes a valid part:
- `<non-negative integer><unit>` - so digits followed by a single letter unit
- No space between number and unit
- Space between parts is optional (one or more spaces)

Approach:
1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Parse the string into parts
4. Validate order, no repeats, valid units, etc.

Let me think about parsing more carefully:

The format is: `<digits><letter>` optionally separated by spaces.

I can use regex to tokenize. Let me think about a regex approach:

Pattern for a part: `(\d+)([dhms])`

But I need to ensure:
- No other characters (no decimals like "1.5h", no signs like "+1h" or "-1h")
- No uppercase
- No other separators
- No space between number and unit within a part
- Spaces only between parts

Let me think about this more carefully. The string after stripping should match:
`(\d+[dhms])(\s+\d+[dhms])*`

Wait, but spaces can be one or more. Let me use: `(\d+[dhms])(?:\s+\d+[dhms])*`

Actually, I need to be more careful. Let me think about what could go wrong:
- "1h 30m" - valid
- "1h30m" - valid
- "1h  30m" - valid (multiple spaces)
- " 1h 30m " - valid (leading/trailing whitespace)
- "" - invalid (empty)
- "   " - invalid (blank)
- "1H" - invalid (uppercase)
- "1.5h" - invalid (decimal)
- "+1h" - invalid (sign)
- "-1h" - invalid (sign)
- "1x" - invalid (unknown unit)
- "1" - invalid (number without unit)
- "h" - invalid (unit without number)
- "1h1h" - invalid (repeated unit)
- "30m1h" - invalid (wrong order)
- "1h30" - invalid (number without unit at end)
- "1h 30" - invalid (number without unit)

Let me use a regex approach:

```python
import re

def parse_duration(s: str) -> int:
    # Strip leading/trailing whitespace
    s = s.strip()
    
    # Empty or blank
    if not s:
        raise ValueError("empty or blank string")
    
    # Match the entire string against the valid pattern
    pattern = r'(\d+[dhms])(?:\s+\d+[dhms])*'
    if not re.fullmatch(pattern, s):
        raise ValueError("invalid format")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    # Validate order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen = set()
    prev_order = -1
    total = 0
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError("repeated unit")
        seen.add(unit)
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError("wrong order")
        prev_order = order
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. `re.fullmatch` ensures the entire string matches. The pattern `(\d+[dhms])(?:\s+\d+[dhms])*` should handle:
- Single part: "1h" ✓
- Multiple parts together: "1h30m" ✓ (no spaces needed, the pattern `\d+[dhms]` followed by `\s+\d+[dhms]`... wait, "1h30m" - does this match?

Let me check: "1h30m" - the first part `\d+[dhms]` matches "1h", then `(?:\s+\d+[dhms])*` needs at least one space for the optional group. But "30m" follows immediately without space. So this wouldn't match!

I need to fix the regex. Parts can be together (no space) or separated by spaces. So the separator between parts is optional (zero or more spaces).

Pattern: `(\d+[dhms])(?:\s*\d+[dhms])*`

Wait, but with `\s*`, "1h 30m" would also work since there's a space. And "1h30m" works too. But what about "1h  30m"? `\s*` handles multiple spaces. Good.

But wait - what about "1h " with trailing space? After stripping, that's "1h" which is fine.

What about "1h\n30m"? `\s*` would match the newline too. Is that okay? The problem says "separated by one or more spaces". Hmm, but `\s` includes newlines. Let me use ` *` (literal spaces) instead of `\s*`.

Actually, re-reading: "separated by one or more spaces". So spaces only, not tabs or newlines. Let me use ` ` (space character) for separators.

But leading/trailing whitespace - is that spaces only or any whitespace? The problem says "Leading/trailing whitespace is allowed." I'll use `.strip()` which strips all whitespace, then for internal separators use only space characters.

Pattern: `(\d+[dhms])(?: *\d+[dhms])*`

Let me verify:
- "1h30m" → "1h" matches first group, "30m" matches second group with ` *` (zero spaces). ✓
- "1h 30m" → "1h" first, "30m" with one space. ✓
- "1h  30m" → multiple spaces, ` *` handles it. ✓

Now, what about edge cases:
- "1h30m45s" - valid
- "1d12h30m45s" - valid
- "0s" - valid (0 seconds)
- "0d" - valid (0 seconds)

What about "1h30m" with the regex - let me trace through `re.findall(r'(\d+)([dhms])', s)`:
- For "1h30m45s": finds ("1", "h"), ("30", "m"), ("45", "s") ✓

What about something like "1h30m45sx"? The fullmatch would fail because of the trailing "x". Good.

What about "12"? No unit, fullmatch fails. Good.

What about "h"? No digits before unit, the pattern `\d+[dhms]` requires at least one digit. "h" alone won't match. Good.

What about "1h30"? After stripping: "1h30". The regex `(\d+[dhms])(?: *\d+[dhms])*` - first part "1h" matches, then "30" doesn't match `\d+[dhms]` (no unit). fullmatch fails. Good.

What about "1h30m "? After strip: "1h30m". Matches. Good.

What about "1H30M"? The character class is `[dhms]` (lowercase only), so "H" won't match. Good.

What about "1.5h"? `\d+` matches "1", then `[dhms]` needs to match "." - fails. Good.

What about "+1h" or "-1h"? After strip, starts with "+", `\d+` doesn't match "+". Good.

What about tabs between parts? "1h\t30m" - after strip, the tab remains. The pattern has ` *` (literal space), so tab won't match. fullmatch fails. Good - problem says "spaces" specifically.

Actually wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." So internal separators are spaces only. And "Leading/trailing whitespace is allowed." - I'll use strip() which handles all whitespace for leading/trailing.

Let me also consider: what about "1h30 m"? There's a space between "30" and "m". The regex `\d+[dhms]` requires no space between digits and unit. So "30 m" won't match `\d+[dhms]`. But wait, in "1h30 m", after the first part "1h", the remaining is "30 m". The pattern ` *\d+[dhms]` - it would try to match "30 m" with `\d+[dhms]`. `\d+` matches "30", then `[dhms]` needs to match " " - fails. So fullmatch fails. Good.

Actually wait - could the regex be greedy in a way that "1h30 m" matches as "1h" then "30" then... no, because `\d+[dhms]` requires a letter after digits. Let me double check: the full pattern is `(\d+[dhms])(?: *\d+[dhms])*`. For "1h30 m": first group matches "1h". Then `(?: *\d+[dhms])*` tries: ` *` matches nothing, `\d+` matches "30", `[dhms]` tries to match " " - fails. So the optional group matches zero times. But then the fullmatch is only "1h", not the whole string "1h30 m". So it fails. ✓

Let me also think about "1h 30m" - strip gives "1h 30m". First group "1h". Then ` *` matches " ", `\d+` matches "30", `[dhms]` matches "m". ✓

What about something like "01h02m"? Leading zeros in numbers. `\d+` matches "01" and "02". That seems fine - the problem doesn't forbid leading zeros.

I think my solution is correct. Let me write it up cleanly.

One more thought: what about the string "  " (spaces only)? After strip(), it becomes "", which triggers the empty check. Good.

What about "1h30m 45s"? After strip: "1h30m 45s". First group "1h", then ` *` matches nothing, `\d+[dhms]` matches "30m". Then ` *` matches " ", `\d+[dhms]` matches "45s". ✓

I'm satisfied with the solution. Let me write the final code.
