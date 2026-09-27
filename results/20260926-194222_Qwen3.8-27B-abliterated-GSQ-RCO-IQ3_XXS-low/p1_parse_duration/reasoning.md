The user wants me to write a Python function `parse_duration(s: str) -> int` that converts duration strings to total seconds.

Let me think through the requirements:

1. Format: `<non-negative integer><unit>` parts, no space between number and unit
2. Units: d (86400), h, m, s (lowercase only)
3. Order: d, h, m, s - each at most once, any subset
4. Parts can be together ("1h30m") or separated by one or more spaces ("1h 30m")
5. Leading/trailing whitespace allowed
6. No normalization: "90m" is valid
7. ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

I'll use a regex to split the string into parts, then validate each part.

Approach:
1. Strip leading/trailing whitespace
2. If empty, raise ValueError
3. Split by one or more spaces to get parts
4. Each part must match pattern: `<digits><unit>` where digits are non-negative integer (no sign, no decimal)
5. Units must be in order d, h, m, s
6. Each unit at most once

Let me think about the regex for a single part: `^\d+[dhms]$`

Wait, but I need to validate:
- No decimals (so "1.5h" is invalid)
- No signs (so "+1h" or "-1h" is invalid)
- No uppercase (so "1H" is invalid)
- No missing number (so "h" is invalid)
- No number without unit (so "1" is invalid)
- Unknown unit (so "1x" is invalid)

For splitting: parts are separated by one or more spaces. But I need to be careful - "1h 30m" has a space between parts, but "1h30m" doesn't.

Let me think about this more carefully. If I split by spaces, I might get empty strings. Let me use a regex approach.

Actually, let me use a regex to match the entire string:
- Strip whitespace
- The string should match: `\d+[dhms](\s+\d+[dhms])*`

Wait, but I need to validate that units are in order and not repeated. Let me do it in two steps:
1. Use regex to split into parts
2. Validate each part and the sequence

Let me think about the regex for splitting:
- After stripping, the string should be a sequence of parts separated by optional spaces
- Each part is `\d+[dhms]`

I can use `re.split` with a regex, or better, use `re.findall` to extract all parts.

Actually, let me use `re.fullmatch` on the whole string after stripping:
- Pattern: `\s*\d+[dhms](\s+\d+[dhms])*\s*`

Wait, but I also need to make sure there's no extra stuff. Let me think...

After stripping, the pattern should be: `\d+[dhms](\s+\d+[dhms])*`

But wait, I need to handle the case where there might be spaces between digits and units? No, the rule says "NO space between number and unit".

Let me reconsider. The parts are:
- Each part: digits immediately followed by a unit character
- Parts are separated by 0 or more spaces (one or more spaces between parts, or no spaces at all)

So after stripping leading/trailing whitespace, the pattern is:
`\d+[dhms](\s+\d+[dhms])*`

But I also need to verify the whole string matches (no extra characters).

Let me use `re.fullmatch` on the stripped string with pattern `\d+[dhms](\s+\d+[dhms])*`

Then I extract all parts using `re.findall(r'\d+[dhms]', stripped)`.

Then validate:
- Units must be in order d, h, m, s
- No repeated units

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    # Strip leading/trailing whitespace
    stripped = s.strip()
    
    # Check for empty
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Match the overall pattern
    if not re.fullmatch(r'\d+[dhms](\s+\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration: '{s}'")
    
    # Extract parts
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Validate unit order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    total = 0
    for num, unit in parts:
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order or repeated unit in: '{s}'")
        prev_order = order
        total += int(num) * unit_seconds[unit]
    
    return total
```

Wait, let me think about edge cases:
- "0" - no unit, should be ValueError (number without unit) ✓ (regex won't match)
- "" - empty ✓
- "   " - blank ✓ (strip makes it empty)
- "1H" - uppercase ✓ (regex won't match since [dhms] is lowercase)
- "+1h" - sign ✓ (regex won't match)
- "1.5h" - decimal ✓ (regex won't match, dot isn't in \d+)
- "1h 30M" - uppercase M ✓
- "1h 30m 2h" - wrong order ✓ (order check catches it)
- "1h 1h" - repeated unit ✓ (order check catches it)
- "1x" - unknown unit ✓ (regex won't match)
- "1h2m" - valid, no spaces between ✓
- "1h  2m" - multiple spaces between ✓
- " 1h 2m " - leading/trailing whitespace ✓
- "0h" - valid, 0 seconds ✓
- "0d" - valid, 0 seconds ✓

What about "00d"? The rule says non-negative integer, so "00" is a valid non-negative integer. I'll allow it.

What about a very long number? Python handles big ints natively, so that's fine.

I think this solution is correct. Let me also consider: what if there's a tab or other whitespace? The problem says "separated by one or more spaces" - so only spaces, not tabs. My regex uses `\s` which includes tabs, newlines, etc. Let me use ` ` (space) specifically... wait, but leading/trailing whitespace is allowed. Let me re-read.

"Parts may be written together ("1h30m") or separated by one or more spaces"
"Leading/trailing whitespace is allowed."
"Anything else raises ValueError: ... other separators"

So the separator between parts must be spaces specifically (not tabs). And leading/trailing can be any whitespace? Or just spaces?

Hmm, "other separators" suggests that tabs between parts would be invalid. But "Leading/trailing whitespace is allowed" - does "whitespace" mean any whitespace or just spaces?

I think to be safe, I'll treat the separator as one or more space characters (not tabs, etc.), and leading/trailing as any whitespace (strip handles that). Actually, let me re-read: "separated by one or more spaces". So between parts, it must be spaces.

But "Leading/trailing whitespace is allowed" - I'll use `.strip()` which handles all whitespace for leading/trailing.

For the separator between parts, I'll use ` +` (one or more space characters) rather than `\s+`.

Wait, but what about "1h\t2m"? That would be "other separators" → ValueError. With my current approach using `\s+`, it would match. Let me use ` +` instead.

Hmm, but what about "1h\n2m"? That's also "other separators". Let me use ` +` for the separator.

But then for stripping, I'll use `.strip()` which removes all whitespace from both ends.

Let me revise:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    
    if not stripped:
        raise ValueError("Empty or blank string")
    
    if not re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration: '{s}'")
    
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    total = 0
    for num, unit in parts:
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order or repeated unit in: '{s}'")
        prev_order = order
        total += int(num) * unit_seconds[unit]
    
    return total
```

Wait, what about "1h\t2m"? With `re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', stripped)`, the tab would cause a mismatch, so it would raise ValueError. Good.

What about "1h\n2m"? Same, newline would cause mismatch. Good.

What about "1h\n 2m"? After strip, it's "1h\n 2m" (internal newline and space). The regex ` +` won't match `\n `, so it would fail. Good.

Actually wait, what about "1h \n 2m"? After strip it's "1h \n 2m". The regex ` +` won't match " \n ", so it fails. Good.

I think this is correct. Let me also double-check: "1h30m" - no spaces, regex `\d+[dhms]( +\d+[dhms])*` matches "1h" then "30m" (the ` +` is in a group that's repeated 0 times, but wait...).

Hmm, actually "1h30m" - the regex would try to match "1h" and then look for `(\d+[dhms])` or ` +\d+[dhms]`. Since "30m" follows immediately without a space, the `( +\d+[dhms])*` part needs to match "30m" but it starts with a space... 

Wait no. Let me re-examine. The regex is `\d+[dhms]( +\d+[dhms])*`. 

For "1h30m":
- `\d+` matches "1"
- `[dhms]` matches "h"
- `( +\d+[dhms])*` needs to match "30m"
  - ` +` needs one or more spaces, but "30m" starts with "3"
  - So the group matches 0 times
- Then we're at position 2, but "30m" remains → no full match!

That's a problem! I need the separator to be optional. Let me use `( *\d+[dhms])*` - zero or more spaces followed by the next part.

Actually, re-reading the rules: "Parts may be written together ("1h30m") or separated by one or more spaces". So the separator between parts is either nothing (0 spaces) or one or more spaces. That's zero or more spaces: ` *`.

Let me fix: `\d+[dhms]( *\d+[dhms])*`

For "1h30m":
- `\d+` matches "1", `[dhms]` matches "h"
- `( *\d+[dhms])*` - ` *` matches 0 spaces, `\d+` matches "30", `[dhms]` matches "m"
- Full match! ✓

For "1h 30m":
- `\d+` matches "1", `[dhms]` matches "h"
- `( *\d+[dhms])*` - ` *` matches " ", `\d+` matches "30", `[dhms]` matches "m"
- Full match! ✓

For "1h  30m":
- ` *` matches "  "
- Full match! ✓

For "1h\t30m":
- ` *` can't match "\t"
- No full match → ValueError ✓

Great, let me use ` *` (zero or more spaces).

Final solution:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    
    if not stripped:
        raise ValueError("Empty or blank string")
    
    if not re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration: '{s}'")
    
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    total = 0
    for num, unit in parts:
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order or repeated unit in: '{s}'")
        prev_order = order
        total += int(num) * unit_seconds[unit]
    
    return total
```

This looks good to me.
