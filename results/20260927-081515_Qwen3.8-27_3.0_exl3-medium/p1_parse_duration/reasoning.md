Let me analyze the requirements carefully:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. No space between number and unit
4. Units must appear in order: d, h, m, s (each at most once)
5. Parts can be together ("1h30m") or separated by spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. Raises ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) - but wait, "1h 30m" has spaces between parts. But "1h30m" has no spaces. So I need to handle both.

Actually, let me reconsider. The parts are separated by "one or more spaces" or nothing. So I can:
- Strip the string
- Use regex to parse it

Let me think about a regex approach:
- After stripping, the string should match a pattern of one or more parts
- Each part is: digits followed by a unit character
- Parts are separated by one or more spaces (or nothing)

Wait, but I need to validate:
- Units in order d, h, m, s
- Each unit at most once
- No missing numbers
- No decimals, signs, uppercase

Let me use a regex approach:

Pattern: After stripping, the string should be:
- One or more `<digits><unit>` parts
- Separated by zero or more spaces (but at least one space if separated)

Actually, let me think more carefully. The valid format is:
- `<number><unit>` parts
- Separated by one or more spaces OR nothing
- Leading/trailing whitespace allowed

So after stripping, I need to match: `\d+[dhms](\s+\d+[dhms])*`

But I also need to validate:
- Order: d before h before m before s
- No repeated units
- No unknown units (covered by regex)
- No decimals (covered by regex - only digits)
- No signs (covered by regex)
- No uppercase (covered by regex)

Wait, but the regex `\d+[dhms]` would match things like "1h30m" as two parts without space. Let me think...

Actually, if I use the regex `(\d+[dhms])(\s+\d+[dhms])*` after stripping, it would handle both cases. But I need to make sure the entire string is consumed.

Let me use: `^(\d+[dhms])(\s+\d+[dhms])*$` after stripping.

Wait, but what about "1h  30m" (multiple spaces)? The `\s+` handles that.

But what about "1h30m" - no space? The regex would match "1h" as first part, then "30m" as... wait, `\s+` requires at least one space. So "1h30m" wouldn't match the pattern `(\d+[dhms])(\s+\d+[dhms])*`.

I need to allow parts to be adjacent without spaces. So the separator is `\s*` (zero or more spaces) between parts. But wait, if I use `\s*`, then "1h30m" would be parsed as "1h" + "30m" (no space between). That works!

But what about "1h 30m"? With `\s*`, it would still work.

But wait - what if there's a space in the middle of a number? Like "1 2h"? That shouldn't be valid. With my regex, "1" alone (no unit) wouldn't match `\d+[dhms]`, so it would fail. Good.

Let me reconsider: the regex should be `^(\d+[dhms])(\s*\d+[dhms])*$`

Hmm, but `\s*` between parts... what if someone writes "1h  30m" with multiple spaces? `\s*` handles that.

But what about "1h 30m " (trailing space)? We strip first, so that's handled.

What about " 1h 30m " (leading/trailing spaces)? We strip first.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Match the entire string: one or more <digits><unit> parts, separated by optional spaces
    pattern = r'^(\d+[dhms])(\s*\d+[dhms])*$'
    match = re.match(pattern, s)
    if not match:
        raise ValueError(f"Invalid duration string: {s}")
    
    # Extract all parts
    parts = re.findall(r'\d+[dhms]', s)
    
    # Validate order and uniqueness
    valid_order = ['d', 'h', 'm', 's']
    seen = []
    for part in parts:
        unit = part[-1]
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        if seen and valid_order.index(unit) <= valid_order.index(seen[-1]):
            raise ValueError(f"Wrong order: {unit} after {seen[-1]}")
        seen.append(unit)
    
    # Calculate total seconds
    total = 0
    for part in parts:
        num = int(part[:-1])
        unit = part[-1]
        seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
        total += num * seconds
    
    return total
```

Wait, let me check edge cases:
- "90m" → 90 * 60 = 5400 ✓
- "2d" → 2 * 86400 = 172800 ✓
- "1h30m" → 3600 + 1800 = 5400 ✓
- "45s" → 45 ✓
- "1d4s" → 86400 + 4 = 86404 ✓
- "1h 30m" → 3600 + 1800 = 5400 ✓
- "" → ValueError ✓
- "   " → ValueError ✓
- "1x" → ValueError (unknown unit) ✓
- "1m1h" → ValueError (wrong order) ✓
- "1h1h" → ValueError (repeated unit) ✓
- "h" → ValueError (missing number) - regex won't match ✓
- "1" → ValueError (number without unit) - regex won't match ✓
- "1.5h" → ValueError (decimals) - regex won't match ✓
- "-1h" → ValueError (signs) - regex won't match ✓
- "1H" → ValueError (uppercase) - regex won't match ✓
- "1h,30m" → ValueError (other separators) - regex won't match ✓

Wait, what about "0h"? The number is 0, which is a non-negative integer. Should be valid → 0 seconds.

What about "007h"? Leading zeros... the spec says "non-negative integer". I think "007" is a valid representation of 7. The regex `\d+` would match it. Let me keep it as valid.

Hmm, actually let me re-read: "A part is <non-negative integer><unit>". I think leading zeros should be fine since it's still a non-negative integer representation.

Let me also consider: what if the string has tabs or other whitespace? The spec says "separated by one or more spaces". Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the separator is specifically spaces. But "Leading/trailing whitespace is allowed" - does that include tabs? I'll use `\s` to be safe, since "whitespace" generally includes spaces, tabs, etc. Actually, let me re-read: "separated by one or more spaces". This specifically says spaces. But "Leading/trailing whitespace is allowed" - this could include tabs.

Hmm, I think I'll use `\s` for both the separator and the strip, to be safe. Actually, "other separators" should raise ValueError. So if someone uses a tab as separator between parts, is that valid? The spec says "separated by one or more spaces". I think I should be strict and only allow spaces (not tabs) as separators between parts. But for leading/trailing, "whitespace" is more general.

Actually, let me re-read more carefully: "Parts may be written together ("1h30m") or separated by one or more spaces". This specifically says spaces. And "other separators" raise ValueError. So tabs between parts would be invalid.

But "Leading/trailing whitespace is allowed" - this is more general. So `s.strip()` handles that.

Let me adjust: use ` ` (space) specifically for the separator between parts, but `\s` for leading/trailing strip.

Actually wait - if I use `re.match(r'^(\d+[dhms])( *\d+[dhms])*$', s)` with just spaces, then tabs between parts would fail. But what about "1h\t30m"? The regex wouldn't match because `\t` is not a space. Good, that would raise ValueError.

But what about leading/trailing tabs? `s.strip()` would remove them. That seems fine.

Let me refine:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Match: one or more <digits><unit> parts, separated by zero or more spaces
    pattern = r'^(\d+[dhms])( *\d+[dhms])*$'
    if not re.match(pattern, s):
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Extract all parts
    parts = re.findall(r'\d+[dhms]', s)
    
    # Validate order and uniqueness
    valid_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    last_idx = -1
    seen = set()
    for part in parts:
        unit = part[-1]
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        if valid_order[unit] <= last_idx:
            raise ValueError(f"Wrong order: {unit}")
        seen.add(unit)
        last_idx = valid_order[unit]
    
    # Calculate total seconds
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = 0
    for part in parts:
        num = int(part[:-1])
        unit = part[-1]
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. `(\d+[dhms])( *\d+[dhms])*` - this matches:
- First part: `\d+[dhms]`
- Then zero or more groups of: optional spaces + `\d+[dhms]`

For "1h30m": matches "1h" then "30m" (no space). ✓
For "1h 30m": matches "1h" then " 30m". ✓
For "1h  30m": matches "1h" then "  30m". ✓
For "1h\t30m": the ` *` won't match `\t`, so the full match fails. ✓ (raises ValueError)

Hmm wait, but what about "1h 30m" - the regex `( *\d+[dhms])*` - the space is part of the group. So it matches " 30m". Good.

What about a string like "1h " (trailing space within the non-stripped context)? After strip, it becomes "1h". Fine.

What about " 1h 30m "? After strip: "1h 30m". Regex matches. Good.

I think this solution is correct. Let me also make sure the error messages are reasonable. The spec just says "raises ValueError" without specifying the message, so any message is fine.

One more thing: what about very large numbers? Python handles big integers natively, so no issue there.

I'm satisfied with this solution. Let me write the final version.
