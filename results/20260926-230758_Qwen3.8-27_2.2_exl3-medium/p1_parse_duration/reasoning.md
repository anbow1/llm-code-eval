Let me analyze the requirements carefully:

1. Parse a duration string like "1d4h30m15s" or "1h 30m"
2. Units: d (86400), h (3600), m (60), s (1)
3. Parts are `<non-negative integer><unit>` with no space between number and unit
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Any subset is allowed
7. Parts can be together or separated by one or more spaces
8. Leading/trailing whitespace allowed
9. No normalization (90m is valid)
10. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by spaces (one or more)
- Each part must match pattern: `<digits><unit>` where unit is one of d, h, m, s
- The digits must be non-negative integers (no signs, no decimals)
- Units must be in order d, h, m, s
- Each unit appears at most once

Let me think about the regex for a single part: `^\d+[dhms]$`

Wait, I need to be careful. The number is a non-negative integer. So it's one or more digits. No leading zeros? Actually, the problem says "non-negative integer" - so "0" is valid, "00" might be valid too since it's still a non-negative integer. Let me think... "00s" - is that valid? The problem says "non-negative integer" which could include leading zeros. I'll allow them since it's still a valid integer representation.

Actually, let me re-read: "A part is <non-negative integer><unit>". So the number part is a non-negative integer. I'll use `\d+` which allows leading zeros.

Now for the overall structure:
- Strip whitespace
- If empty, ValueError
- Split by whitespace (one or more spaces)
- Validate each part matches `\d+[dhms]`
- Check that units are in order d, h, m, s
- Check no repeated units

Let me think about "other separators" - this means if someone writes "1h,30m" or "1h\t30m" or "1h  30m" (multiple spaces is OK since it says "one or more spaces"). Wait, "separated by one or more spaces" - so multiple spaces between parts is allowed. But tabs, commas, etc. are not.

Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the only valid separator between parts is spaces (one or more). Any other character would be invalid.

Let me think about the approach:
1. Strip the string
2. If empty, ValueError
3. Split by whitespace - but I need to be careful. If I use `split()`, it splits on any whitespace including tabs. But the requirement says "one or more spaces" specifically. So I should only allow spaces as separators.

Wait, "other separators" raises ValueError. So if there's a tab between parts, that's invalid. Let me be strict: only space characters (0x20) are valid separators.

Actually, let me reconsider. "Leading/trailing whitespace is allowed" - this could include tabs, newlines, etc. at the edges. But between parts, only spaces.

Hmm, let me think about this more carefully. The rule says "separated by one or more spaces". I'll interpret "spaces" as the space character specifically. But "leading/trailing whitespace" could be any whitespace.

Let me use a regex approach:
- After stripping, the string should match: `(?:\d+[dhms])(?: +\d+[dhms])*`

Wait, but I also need to validate the order. Let me use a regex to extract parts, then validate order.

Actually, let me use a more structured approach:

1. Strip the string
2. If empty, ValueError
3. Use regex to match the entire string: `^(?:\d+[dhms])(?: +\d+[dhms])*$`
   - This ensures: parts are together or separated by one or more spaces
   - Each part is digits followed by a unit character
4. Extract all parts
5. Validate order: d < h < m < s (each unit at most once, in order)

Wait, I need to be more careful with the regex. Let me think about what should NOT match:
- "1h 30m" - valid (spaces between)
- "1h30m" - valid (together)
- "1h,30m" - invalid (comma)
- "1h\t30m" - invalid (tab)
- "1.5h" - invalid (decimal)
- "-1h" - invalid (sign)
- "1H" - invalid (uppercase)
- "1x" - invalid (unknown unit)
- "1" - invalid (no unit)
- "1d2d" - invalid (repeated unit)
- "1m1h" - invalid (wrong order)

The regex `^(?:\d+[dhms])(?: +\d+[dhms])*$` would:
- Match "1h30m" ✓
- Match "1h 30m" ✓
- Reject "1h,30m" ✓ (comma not allowed)
- Reject "1h\t30m" ✓ (tab not allowed)
- Reject "1.5h" ✓ (dot not a digit)
- Reject "-1h" ✓ (minus not a digit)
- Reject "1H" ✓ (H not in [dhms])
- Reject "1x" ✓ (x not in [dhms])
- Reject "1" ✓ (no unit)

Wait, what about "1h  30m" (two spaces)? The regex ` +` matches one or more spaces, so yes it would match. Good.

What about " 1h 30m " (leading/trailing spaces)? After strip, it becomes "1h 30m", which matches. Good.

What about empty string ""? After strip, it's "", which doesn't match the regex. ValueError. Good.

What about "   " (only spaces)? After strip, it's "", ValueError. Good.

Now for order validation:
- Extract units from each part
- Check they are in order d, h, m, s
- Check no duplicates

Let me assign order values: d=0, h=1, m=2, s=3
- For each part, get the unit
- Check that units are strictly increasing (since each unit appears at most once)
- Check no unknown units (already handled by regex)

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Match the overall structure
    match = re.fullmatch(r'(?:\d+[dhms])(?: +\d+[dhms])*', s)
    if not match:
        raise ValueError("invalid format")
    
    # Extract parts
    parts = re.findall(r'\d+[dhms]', s)
    
    # Validate order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    prev = -1
    for part in parts:
        unit = part[-1]
        num = int(part[:-1])
        order = unit_order[unit]
        if order <= prev:
            raise ValueError("wrong order or repeated unit")
        prev = order
    
    # Calculate total seconds
    total = 0
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    for part in parts:
        unit = part[-1]
        num = int(part[:-1])
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check: "1d4s" - d has order 0, s has order 3. 3 > 0, so valid. Good.

"1h30m" - h has order 1, m has order 2. 2 > 1, valid. Good.

"1m1h" - m has order 2, h has order 1. 1 < 2, invalid. Good.

"1d1d" - d has order 0, d has order 0. 0 <= 0, invalid. Good.

What about "0s"? That's valid - 0 seconds. The number is a non-negative integer.

What about "00s"? Leading zeros - still a valid non-negative integer. I'll allow it.

Hmm, actually let me reconsider whether "00s" should be valid. The problem says "non-negative integer". "00" is a valid representation of the integer 0. I'll allow it.

Let me also think about edge cases:
- "0" - no unit, regex won't match. ValueError. Good.
- "1d" - valid, 86400.
- "s" - no number, regex won't match. ValueError. Good.

I think this solution is correct. Let me finalize it.

Actually wait - I should double-check: does `re.fullmatch` work correctly here? Yes, `fullmatch` ensures the entire string matches the pattern.

One more thing: the problem says "other separators" raise ValueError. My regex only allows spaces between parts, so tabs, commas, etc. would fail the regex match. Good.

Let me also make sure: "1h 30m " (trailing space) - after strip, "1h 30m", matches. Good.
" 1h 30m" (leading space) - after strip, "1h 30m", matches. Good.

I think the solution is complete. Let me write the final version.
