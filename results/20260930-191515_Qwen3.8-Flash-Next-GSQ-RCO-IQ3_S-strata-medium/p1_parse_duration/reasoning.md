Let me carefully analyze the requirements:

1. Parse a duration string into total seconds
2. Parts format: `<non-negative integer><unit>` with NO space between number and unit
3. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
4. Units must appear in order d, h, m, s. Each at most once. Any subset allowed.
5. Parts may be together ("1h30m") or separated by one or more spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization: "90m" is valid
8. Anything else raises ValueError

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- Split by one or more spaces to get tokens
- For each token, it must be a valid `<non-negative integer><unit>` part
- Check that units are in order d, h, m, s and each appears at most once

Wait, parts may be written together like "1h30m" without spaces. So I can't just split by spaces. I need a more general parsing approach.

Actually, let me reconsider. The parts can be:
- Together: "1h30m" 
- Separated by one or more spaces: "1h 30m"
- Mixed: "1h 30m" with extra spaces

So the valid separators between parts are: nothing or one or more spaces.

I think the best approach is:
1. Strip the string
2. Use regex to validate and extract parts

Let me think about the regex approach:
- The entire string (after stripping) should consist of parts that match `(\d+)(d|h|m|s)` separated optionally by spaces.
- Full regex: `^\s*(\d+[dhms])(\s*(\d+[dhms]))*\s*$` - but this is overly permissive.

Actually, let me think more carefully. The format is:
- Optional leading whitespace
- One or more parts, where each part is `\d+[dhms]`
- Parts are separated by one or more spaces (or nothing)
- Optional trailing whitespace

Wait, "separated by one or more spaces" - but they can also be written together with NO separator. So between parts, the separator is zero or more spaces? Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the separator between parts can be: nothing (zero spaces) or one or more spaces. Effectively, zero or more spaces between parts.

But wait - if parts are written together, how do we know where one part ends and the next begins? Since each part ends with a unit letter (d, h, m, s) and starts with digits, the boundary is clear.

Let me use regex:
- Strip the input
- The valid format after stripping: one or more `(\d+)([dhms])` groups, optionally separated by spaces

Regex: `^\s*(\d+[dhms]\s*)+\s*$` - but this would allow trailing spaces after the last unit which is handled by stripping. Actually after stripping, there shouldn't be leading/trailing whitespace. Let me think...

After stripping, the pattern should be: `(\d+[dhms])(\s*\d+[dhms])*`

Wait, but between two parts like "1h30m", there's no space. Between "1h 30m" there's a space. Between "1h   30m" there are multiple spaces. So the separator between parts is `\s*` (zero or more spaces). But actually, if there are zero spaces, the parts are concatenated. If there are one or more spaces, they're separated.

Hmm, but "0 or more spaces" as separator means after stripping, the internal pattern is: parts separated by `\s*`. But since we strip first, we don't have leading/trailing spaces. So after stripping:

`^(\d+[dhms])(\s*\d+[dhms])*$`

Wait, but this would also match "1h   30m" (multiple spaces between parts) which is valid. And "1h30m" (no spaces) which is valid. Good.

But would it match "1h3 0m"? No, because after "1h", we need `\s*` then `\d+[dhms]`. "3 0m" - "3" doesn't match `\s*` because 3 is not a space. Wait, `\s*` matches zero or more spaces. After "1h", we have "3 0m". `\s*` would match zero spaces, then we need `\d+[dhms]`. "3 " - `\d+` would match "3", but then we need `[dhms]` and next char is space. So it wouldn't match. Good.

What about "1h0m"? After "1h", `\s*` matches zero spaces, then `\d+[dhms]` tries to match "0m" - yes it would match. "1h0m" → 1h + 0m = 3600 + 0 = 3600. Is this valid? The spec says each part is `<non-negative integer><unit>`. 0m is a non-negative integer with unit. So yes, "1h0m" should be valid = 3600 seconds. OK.

Now after extracting the parts, I need to validate:
1. Units are in order d, h, m, s
2. Each unit appears at most once

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("invalid duration")
    
    s = s.strip()
    
    if not s:
        raise ValueError("invalid duration")
    
    # Try to match the entire string as one or more parts
    pattern = r'^(\d+)([dhms])(\s*(\d+)([dhms]))*$'
    match = re.fullmatch(pattern, s)
    
    if not match:
        raise ValueError("invalid duration")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    if not parts:
        raise ValueError("invalid duration")
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    total = 0
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError("repeated unit")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("wrong order")
        seen.add(unit)
        last_order = order
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, let me reconsider the regex. The fullmatch with the grouped pattern might have issues. Let me use a simpler approach:

After stripping, try to match the entire string against a pattern that consists of one or more `\d+[dhms]` parts separated by `\s*`.

Actually, let me think about edge cases:
- Empty string after stripping → ValueError
- "abc" → ValueError (no match)
- "1h30x" → ValueError (unknown unit)
- "30m1h" → ValueError (wrong order) - regex would match but order check fails
- "1h1h" → ValueError (repeated unit)
- "h30m" → ValueError (missing number) - regex wouldn't match since `\d+` requires at least one digit
- "1h " → after strip: "1h" → valid
- " 1h " → after strip: "1h" → valid
- "1.5h" → ValueError (decimal) - regex wouldn't match because `.` isn't in `\d`
- "-1h" → ValueError (sign) - regex wouldn't match because `-` isn't in `\d`
- "1H" → ValueError (uppercase) - regex only matches lowercase [dhms]
- "1h;30m" → ValueError (other separator) - regex wouldn't match
- "" → ValueError (empty)
- "   " → ValueError (blank)

Let me reconsider the regex pattern. Using `re.fullmatch` on the stripped string:

Pattern: `(\d+[dhms])(\s*\d+[dhms])*`

This means: one part, followed by zero or more (optional spaces + one part) groups.

Let me test mentally:
- "1h30m": "1h" matches first part, then "" + "30m" matches the group. ✓
- "1h 30m": "1h" matches first part, then " " + "30m" matches the group. ✓
- "1h   30m": "1h" matches first part, then "   " + "30m" matches. ✓
- "2d": "2d" matches first part, zero groups. ✓
- "45s": "45s" matches first part. ✓
- "1d4s": "1d" matches, then "" + "4s" matches. ✓
- "90m": "90m" matches. ✓

What about "1h2h3m"? Regex matches. Then order check: h, h - repeated unit → ValueError. Good.
What about "30m1h"? Regex matches. Then order check: m (order 2), h (order 1) - 1 <= 2, wrong order → ValueError. Good.

What about something like "1h000m"? Regex matches. "000" is a valid non-negative integer (it's 0). So total = 3600 + 0 = 3600. Is "000m" valid? The spec says "non-negative integer" which 000 technically is (value 0). I'll allow it.

What about just a number like "123"? Regex requires `[dhms]` at end, so it won't match. → ValueError. Good.

What about "123 456"? Regex: "123" - no, first part needs `\d+[dhms]`, "123 " has space after digits. Won't match. → ValueError. Good.

Hmm wait, what about the regex matching? Let me reconsider. `re.fullmatch(r'(\d+[dhms])(\s*\d+[dhms])*', s)` - this requires the entire string to match. Good.

But wait, I'm using `re.findall(r'(\d+)([dhms])', s)` to extract parts after the fullmatch succeeds. This should work since if fullmatch succeeds, all `\d+[dhms]` patterns in the string are exactly the parts.

Actually, could there be a case where `re.findall` finds something different from what the structure expects? Since we've already validated with fullmatch that the entire string is well-formed, `findall` will correctly extract all parts. Good.

Let me also consider: what if the string has a tab character as separator? "1h\t30m"? The spec says "separated by one or more spaces". Does "spaces" mean literal space character (0x20) or any whitespace? The spec says "Leading/trailing whitespace is allowed" and "separated by one or more spaces". I think "spaces" here means whitespace characters in general (spaces, tabs, etc.) since it also says "whitespace" for leading/trailing. Let me use `\s` which matches any whitespace.

Actually, re-reading: "Leading/trailing whitespace is allowed" and "separated by one or more spaces". I'll use `\s` for both to be safe, treating "spaces" as whitespace.

Let me also handle the case where the input is not a string (though the type hint says str). I'll add a check.

One more thing: the regex `re.fullmatch` - I need to make sure it returns None for non-matching strings. Yes, it does.

Let me also think: could `\s*` in the separator cause issues? For example "1h\n\n\n30m" - after strip, this becomes "1h\n\n\n30m". The regex `\s*` would match the newlines. Is that valid per spec? The spec says "separated by one or more spaces" - I'll interpret this as whitespace to be safe. Actually, the spec might mean literal space characters. But since it says "whitespace" for leading/trailing, I'll use `\s` throughout.

Actually, wait. Let me re-read: "Leading/trailing whitespace is allowed" - this explicitly uses the word "whitespace". "separated by one or more spaces" - this says "spaces". Hmm, ambiguous. I'll use `\s` for stripping (since it says "whitespace") and `\s` for separators too (since "spaces" in common usage includes all whitespace, and using `\s` is more permissive which is safer for valid inputs).

Actually, for stripping I'll use `s.strip()` which strips all whitespace. For separators, I'll use `\s*`. This should be fine.

Let me finalize the code:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    pattern = r'(\d+[dhms])(\s*\d+[dhms])*'
    if not re.fullmatch(pattern, s):
        raise ValueError("invalid format")
    
    parts = re.findall(r'(\d+)([dhms])', s)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    total = 0
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError("repeated unit")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("units must be in order d, h, m, s")
        seen.add(unit)
        last_order = order
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check: `re.fullmatch` returns None if no match, or a match object if it matches. Using `if not re.fullmatch(...)` correctly checks for no match.

Let me also consider: what about very large numbers? Python handles arbitrary integers, so that's fine.

What about "0s"? That's a non-negative integer (0) with unit s. Should be valid, returns 0.

What about "00d"? Valid, returns 0.

I think this solution is correct. Let me write it up cleanly.
