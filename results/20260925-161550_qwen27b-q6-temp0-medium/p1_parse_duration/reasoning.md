Let me analyze the requirements:

1. Parse a duration string like "1h30m", "2d", "45s", "1d4s", "1h 30m"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must be in order: d, h, m, s - each at most once
4. Parts can be together or separated by spaces
5. No normalization - "90m" is valid
6. Raise ValueError for invalid inputs

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- The string should consist of parts separated by spaces (one or more) or concatenated
- Each part is: one or more digits followed by a single unit character (d, h, m, s)
- No signs, no decimals, no other characters

Approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex to match the entire string
4. Validate the order of units

Let me think about the regex:
- The string is composed of parts separated by optional spaces (one or more)
- Each part: `\d+[dhms]`
- Parts are separated by spaces (one or more) or nothing

Actually, let me think more carefully. The format is:
- Parts joined by either nothing or one or more spaces
- So: `part( space* part)*` where space is ` +` (one or more spaces)

Wait, "separated by one or more spaces" - so if there's a space, it must be one or more. But parts can also be directly adjacent.

Let me use a regex approach:
- Pattern: `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$`

This matches:
- Optional leading whitespace
- First part: digits + unit
- Zero or more subsequent parts: one or more spaces + digits + unit
- Optional trailing whitespace

Then I need to validate:
1. Units are in correct order (d before h before m before s)
2. No repeated units

Let me think about edge cases:
- "90m" - valid, 5400 seconds
- "1h30m" - valid, 5400 seconds
- "1h 30m" - valid, 5400 seconds
- "1h  30m" - valid (multiple spaces)
- " 1h30m " - valid (leading/trailing whitespace)
- "" - ValueError
- "   " - ValueError (blank string)
- "1x" - ValueError (unknown unit)
- "m1" - ValueError (missing number before unit? Actually "m1" - the regex won't match because m is a unit and 1 is a digit, so "m1" won't match the pattern)
- "1" - ValueError (number without unit)
- "1.5h" - ValueError (decimals)
- "-1h" - ValueError (signs)
- "1H" - ValueError (uppercase)
- "1h 30m 2h" - ValueError (wrong order / repeated)
- "1m 1h" - ValueError (wrong order)
- "1h1h" - ValueError (repeated unit)

Wait, what about "  " (just spaces)? After strip it's empty, so ValueError.

What about tabs or other whitespace? The problem says "one or more spaces" for separators and "Leading/trailing whitespace is allowed." I'll interpret whitespace as spaces only based on the problem statement saying "spaces". Actually, let me re-read: "separated by one or more spaces" and "Leading/trailing whitespace is allowed."

I'll use `\s` for leading/trailing and ` ` (regular space) for separators between parts. Actually, to be safe, let me use `\s` for everything since the problem says "whitespace" for leading/trailing. But for separators it specifically says "spaces". Hmm, let me just use `\s` for both to be safe. Actually no - the problem says "one or more spaces" for separators. Let me use ` ` (space) for separators and `\s` for leading/trailing.

Wait, actually re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

I think "whitespace" in "Leading/trailing whitespace is allowed" could mean any whitespace. But "spaces" in "separated by one or more spaces" specifically means spaces. Let me be conservative and only allow spaces for separators, and any whitespace for leading/trailing.

Actually, to keep it simple and safe, let me just use `\s` everywhere. If the problem intended only spaces, then using `\s` is a superset. But wait, the problem says "Anything else raises ValueError: ... other separators." So tabs between parts should raise ValueError. Let me use only ` ` (space) for separators.

Hmm, but "Leading/trailing whitespace is allowed" - does this include tabs? I'll allow `\s` for leading/trailing and only ` ` for internal separators.

Let me write the regex:
```
^\s*(\d+[dhms])( +\d+[dhms])*\s*$
```

This should work. Let me verify:
- "1h30m" → matches: "1h" then "30m" (no space between)
- "1h 30m" → matches: "1h" then " 30m" (space between)
- "1h  30m" → matches: "1h" then "  30m" (two spaces)
- " 1h30m " → matches with leading/trailing spaces
- "90m" → matches
- "" → no match (after strip it's empty, but actually the regex with `^\s*` would match empty... wait no, it requires at least one `(\d+[dhms])`)
- "   " → `\s*` matches all spaces, but then `(\d+[dhms])` is required, so no match. Good.

Wait, I should strip first and check if empty, or just let the regex handle it. The regex requires at least one part, so empty/blank strings won't match.

Now for validation:
- Extract all (number, unit) pairs
- Check that units are in strictly increasing order: d < h < m < s (where d=0, h=1, m=2, s=3)
- Check no unit appears more than once (this is implied by strictly increasing order)

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")
    
    pattern = r'^\s*(\d+[dhms])( +\d+[dhms])*\s*$'
    match = re.fullmatch(pattern, s)
    if not match:
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Extract parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    last_order = -1
    for num_str, unit in parts:
        if unit_order[unit] <= last_order:
            raise ValueError(f"Invalid duration string: {s!r}")
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to be careful. The `re.findall` with `(\d+)([dhms])` on the string "1h30m" would find [("1", "h"), ("30", "m")]. That's correct.

But what about something like "12h34m"? `re.findall(r'(\d+)([dhms])', "12h34m")` → [("12", "h"), ("34", "m")]. Correct.

What about "1h30m" with spaces? "1h 30m" → `re.findall(r'(\d+)([dhms])', "1h 30m")` → [("1", "h"), ("30", "m")]. Correct.

Let me also think about whether the regex properly rejects things:
- "1.5h" → The regex `\d+[dhms]` won't match "1.5h" because of the dot. The fullmatch would fail. Good.
- "-1h" → Won't match because of the minus. Good.
- "1H" → Won't match because H is not in [dhms]. Good.
- "1" → Won't match because there's no unit. Good.
- "h" → Won't match because there's no number. Good.
- "1h2h" → The regex matches (two parts), but the order check will catch it (h=1, h=1, 1<=1 so ValueError). Good.
- "1m1h" → Regex matches, but order check: m=2, h=1, 1<=2 so ValueError. Good.

What about very large numbers? Python handles big integers natively, so no issue.

What about "0s"? Should be valid, returns 0. Let me check: "0" is a non-negative integer, "s" is a valid unit. Yes, should be valid.

What about "0d0h0m0s"? Valid, returns 0.

I think this solution is correct. Let me also consider: should I handle the case where `s` is not a string? The function signature says `s: str`, so I'll assume it's always a string. But adding a check doesn't hurt. Actually, the problem says to raise ValueError for invalid inputs, so if someone passes a non-string, raising ValueError seems reasonable. But the type hint says str, so maybe I don't need to. I'll leave it without the isinstance check to keep it clean.

Actually, let me reconsider the regex. What if there's a tab in the string? Like "1h\t30m"? The regex uses ` +` (one or more spaces) for separators, so a tab wouldn't match. The fullmatch would fail, and we'd raise ValueError. That's correct per the spec.

What about "1h\n30m"? Same - newline isn't a space, so it won't match the separator. But wait, `\s*` at the start and end would match newlines. So "1h\n30m" - the `\s*` at start matches nothing (or the initial whitespace), then `(\d+[dhms])` matches "1h", then `( +\d+[dhms])*` - the `\n` is not a space, so it won't match the separator. Then `\s*$` - the "30m" is not whitespace. So fullmatch fails. Good.

What about "\n1h30m\n"? The `\s*` at start matches "\n", then "1h30m" matches, then `\s*$` matches "\n". Valid. Good.

I think the solution is solid. Let me finalize it.
