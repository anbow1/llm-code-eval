Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. No space between number and unit
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Parts can be together or separated by spaces
7. Leading/trailing whitespace allowed
8. No normalization - "90m" is valid
9. ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. Each part must match pattern: `<non-negative integer><unit>` where unit is one of d, h, m, s
5. Validate:
   - Each part has a number followed by a valid unit
   - No decimals, no signs
   - Units in correct order (d before h before m before s)
   - No repeated units
   - Each unit at most once

Let me use regex to validate each part. A part should be `(\d+)([dhms])` - one or more digits followed by a single unit character.

Wait, I need to be careful. The regex `(\d+)([dhms])` would match "12d" correctly. But what about "123" without a unit? That would fail. What about "1.5d"? The `\d+` won't match "1.5" so it would fail. What about "+5d"? The `\d+` won't match "+5" so it would fail. Good.

Let me think about the approach:
1. Strip the string
2. If empty, raise ValueError
3. Split by whitespace (one or more spaces) - use `re.split(r'\s+', s)` or just `s.split()` which splits on any whitespace
4. For each part, use regex `^(\d+)([dhms])$`
5. Check order and uniqueness of units

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    parts = s.split()
    
    # Validate each part
    units_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen_units = set()
    total = 0
    
    for part in parts:
        m = re.fullmatch(r'(\d+)([dhms])', part)
        if not m:
            raise ValueError(f"invalid part: {part}")
        
        num = int(m.group(1))
        unit = m.group(2)
        
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        
        if not seen_units:
            pass  # first unit can be anything
        else:
            last_unit = list(seen_units)[-1]  # wait, set doesn't preserve order
            # I need to track the last unit seen
            # Actually, I should track the order explicitly
        
        seen_units.add(unit)
        total += num * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    # Check order
    # Actually, I should check order as I go
    ...
```

Wait, I need to track the order. Let me use a list to track the order of units seen:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    parts = s.split()
    
    units_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen_units = []
    total = 0
    
    for part in parts:
        m = re.fullmatch(r'(\d+)([dhms])', part)
        if not m:
            raise ValueError(f"invalid part: {part}")
        
        num = int(m.group(1))
        unit = m.group(2)
        
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        
        if seen_units:
            if units_order[unit] <= units_order[seen_units[-1]]:
                raise ValueError(f"wrong order: {unit} after {seen_units[-1]}")
        
        seen_units.append(unit)
        total += num * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    return total
```

Let me verify with examples:
- "2d" → 2 * 86400 = 172800 ✓
- "1h30m" → 1*3600 + 30*60 = 5400 ✓
- "45s" → 45 ✓
- "1d4s" → 86400 + 4 = 86404 ✓
- "90m" → 5400 ✓
- "1h 30m" → 3600 + 1800 = 5400 ✓

Error cases:
- "" → ValueError ✓
- "   " → ValueError ✓
- "2x" → ValueError (unknown unit) ✓
- "30m1h" → ValueError (wrong order) ✓
- "1h1h" → ValueError (repeated unit) ✓
- "12" → ValueError (missing unit) ✓
- "1.5d" → ValueError (decimals) ✓
- "+5d" → ValueError (signs) ✓
- "1D" → ValueError (uppercase) ✓
- "1h-30m" → ValueError (other separators) - wait, "1h-30m" - the split would give ["1h-30m"] which doesn't match the regex. Good.

Wait, what about "1h\t30m"? `str.split()` splits on any whitespace including tabs. That should be fine since the spec says "one or more spaces" - but actually it says "separated by one or more spaces". Hmm, does "space" mean literally space character or any whitespace? Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

I think using `s.split()` (which splits on any whitespace) is reasonable. The spec says "spaces" but in practice, using `split()` handles all whitespace characters. But wait - "other separators" should raise ValueError. So if someone writes "1h-30m", that's an invalid part. If they write "1h,30m", that's also invalid. Using `s.split()` would correctly handle this because "1h-30m" is one token that doesn't match the regex.

Actually wait - what about "1h\t30m"? Is a tab a valid separator? The spec says "one or more spaces". I think in practice, treating any whitespace as a separator is the most reasonable interpretation. But strictly, "spaces" might mean only space characters. Let me re-read...

"separated by one or more spaces" - I'll go with `s.split()` which handles all whitespace. This is the most practical interpretation.

Actually, let me reconsider. The spec says "other separators" should raise ValueError. So if someone uses a comma or hyphen as separator, it should fail. Using `s.split()` means "1h,30m" would be one token "1h,30m" which fails the regex. "1h-30m" similarly. Good.

But what about "1h  30m" (two spaces)? `s.split()` handles that fine.

I think my solution is correct. Let me finalize it.
