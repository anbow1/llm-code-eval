Let me analyze the requirements:

1. Parse a duration string like "2d", "1h30m", "45s", "1d4s", "1h 30m"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order: d, h, m, s
4. Each unit at most once
5. Parts can be together or separated by spaces
6. No normalization (90m is valid)
7. Raise ValueError for invalid inputs

Let me think about the approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces to get parts
4. For each part, it should be a non-negative integer followed by a single unit character (d, h, m, s)
5. Validate that units are in correct order (d before h before m before s)
6. Validate each unit appears at most once
7. Sum up all the seconds

For parsing each part:
- Must match pattern: one or more digits followed by exactly one of d/h/m/s
- No spaces within a part (we already split by spaces)
- No signs, no decimals, no uppercase

Let me think about edge cases:
- "  " (only spaces) → ValueError (empty or blank)
- "1d 2d" → ValueError (repeated unit)
- "1h1d" → ValueError (wrong order)
- "1d2h" → valid
- "12" → ValueError (missing unit)
- "1.5h" → ValueError (decimals)
- "-1h" → ValueError (signs)
- "1H" → ValueError (uppercase)
- "" → ValueError
- " 1h 30m " → valid (stripped)

For the regex approach, I could use a regex to match each part: `^\d+[dhms]$`

Then I need to validate the order. Let me assign indices: d=0, h=1, m=2, s=3. The indices must be strictly increasing.

Let me write this:

```python
import re

def parse_duration(s: str) -> int:
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    s = s.strip()
    if not s:
        raise ValueError("Empty string")
    
    # Split by one or more spaces
    parts = s.split()
    
    if not parts:
        raise ValueError("Empty or blank string")
    
    total = 0
    last_order = -1
    
    for part in parts:
        if not re.match(r'^\d+[dhms]$', part):
            raise ValueError(f"Invalid part: {part}")
        
        num = int(part[:-1])
        unit = part[-1]
        
        if unit_order[unit] <= last_order:
            raise ValueError(f"Wrong order or repeated unit: {unit}")
        
        last_order = unit_order[unit]
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to check: "separated by one or more spaces" - using `s.split()` handles that since it splits on any whitespace and ignores leading/trailing. But wait, the problem says "one or more spaces" - what about tabs? The problem says "other separators" should raise ValueError. So I should only allow spaces (not tabs).

Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

"Anything else raises ValueError: ... other separators"

So tabs should raise ValueError. Let me be more careful.

Actually, "Leading/trailing whitespace is allowed" - this could include tabs. But "other separators" in the middle should raise ValueError.

Hmm, let me think about this more carefully. The safest approach:
1. Strip the string (this removes leading/trailing whitespace including tabs)
2. Split by spaces only (not general whitespace)
3. Check that no empty parts exist (which would happen from multiple spaces)

Wait, if I use `s.split(' ')` after stripping, multiple spaces would create empty strings. Let me handle this:

```python
s = s.strip()
if not s:
    raise ValueError("Empty or blank string")

# Split by space, handle multiple spaces
parts = s.split(' ')
# Remove empty strings from multiple spaces
parts = [p for p in parts if p]
```

But wait - what about tabs in the middle? Like "1h\t30m" - this should raise ValueError since tab is not a space.

If I use `s.split(' ')`, then "1h\t30m" would give ["1h\t30m"] as a single part, which wouldn't match the regex, so it would raise ValueError. Good.

What about "1h  30m" (two spaces)? After strip, split by ' ' gives ["1h", "", "30m"]. The empty string would fail the regex. So I should filter out empty strings or handle multiple spaces.

The requirement says "separated by one or more spaces", so multiple spaces should be valid. Let me filter empty parts:

```python
parts = [p for p in s.split(' ') if p]
```

But what about tabs mixed with spaces? Like "1h \t 30m"? After split by ' ', we get ["1h", "\t", "30m"]. The "\t" would fail the regex. Good.

What about "1h\t30m"? Split by ' ' gives ["1h\t30m"]. This fails regex. Good.

What about trailing space already handled by strip. What about "1h \t" after strip? strip() removes trailing whitespace including tab, so we get "1h". Good.

Actually wait - "Leading/trailing whitespace is allowed" - does this mean I should allow tabs at the edges? The problem says whitespace, which typically includes spaces and tabs. Using `.strip()` handles all whitespace at edges.

But in the middle, only spaces (one or more) are allowed as separators. Tabs in the middle should cause an error.

Let me reconsider: after `.strip()`, split by single space, filter out empty strings (from consecutive spaces). Each remaining part must match `^\d+[dhms]$`.

This handles:
- "1h  30m" → parts = ["1h", "30m"] ✓
- "1h\t30m" → parts = ["1h\t30m"] → fails regex ✓ (ValueError)
- "1h \t 30m" → parts = ["1h", "\t", "30m"] → "\t" fails regex ✓ (ValueError)

Looks good. Let me finalize.

Actually, one more edge case: what if the number is "0"? Like "0d" - that should be valid (0 seconds). The regex `\d+` matches "0". Good.

What about very large numbers? Python handles big integers natively, so no issue.

Let me also consider: the problem says "non-negative integer" - so 0 is fine, and there's no upper bound mentioned.

I think my solution is correct. Let me also make sure I don't need to import anything that isn't in the standard library - `re` is standard library. Good.

Final check on the "wrong order" detection: I use `unit_order[unit] <= last_order` which catches both repeated units (equal) and wrong order (less than). Perfect.
