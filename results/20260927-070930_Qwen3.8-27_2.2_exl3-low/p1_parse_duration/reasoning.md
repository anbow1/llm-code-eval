Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Parts are `<non-negative integer><unit>` with no space between number and unit
3. Units: d (86400), h (3600), m (60), s (1)
4. Units must appear in order: d, h, m, s (each at most once, any subset)
5. Parts can be together ("1h30m") or separated by one or more spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

1. Strip leading/trailing whitespace
2. Check if empty → ValueError
3. Split by whitespace (one or more spaces)
4. Each part must match pattern: digits followed by a single lowercase unit character
5. Validate order and uniqueness
6. Calculate total seconds

For splitting: I need to split on one or more spaces. But the parts themselves have no spaces. So I can use `re.split(r'\s+', s.strip())` or just split on whitespace.

Wait, "other separators" should raise ValueError. So I should only allow spaces (single or multiple) as separators. Let me use `re.split(r' +', s.strip())` - but what about tabs? The problem says "one or more spaces" - I'll interpret this as space characters only. Actually, let me re-read: "separated by one or more spaces". I'll stick with spaces only.

Actually, let me think more carefully. The problem says "one or more spaces" - I'll use `re.split(r' +', stripped)` to split on one or more space characters.

For each part, I need to validate:
- Must be digits followed by exactly one valid unit character
- No decimals (no dots)
- No signs (no +, -)
- No uppercase units
- Must have a number (can't be just a unit)
- Must have a unit (can't be just a number)

Pattern for a valid part: `^\d+[dhms]$`

Then I need to check:
- Units are in order d, h, m, s
- No repeated units

Let me write this:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")
    
    parts = stripped.split(' ')
    # Wait, this would give empty strings for multiple spaces
    # Better to use re.split
    
    parts = re.split(r' +', stripped)
    
    # Validate each part
    units_order = ['d', 'h', 'm', 's']
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen_units = []
    total = 0
    
    for part in parts:
        if not re.match(r'^\d+[dhms]$', part):
            raise ValueError(f"invalid part: {part}")
        
        num = int(part[:-1])
        unit = part[-1]
        
        # Check order
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        
        # Check order: each unit must come after the previous one
        if seen_units:
            prev_unit = seen_units[-1]
            if units_order.index(unit) <= units_order.index(prev_unit):
                raise ValueError(f"wrong order: {prev_unit} before {unit}")
        
        seen_units.append(unit)
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to also check that "other separators" raise ValueError. If there's a tab or some other whitespace character, `re.split(r' +', stripped)` won't split on it, so it would remain in a part and fail the regex check. That should work.

Actually wait - what about other whitespace like tabs? If I strip and then split on spaces, a tab would remain in the string and cause the regex to fail. That's correct behavior.

Let me also consider: what if there are multiple spaces between parts? `re.split(r' +', stripped)` handles that correctly - it splits on one or more spaces and doesn't produce empty strings.

Let me trace through examples:
- "2d" → parts = ["2d"] → num=2, unit='d' → 172800 ✓
- "1h30m" → parts = ["1h30m"] → wait, this is ONE part "1h30m"

Hmm, that's a problem. "1h30m" is written together. So it's not split by spaces. I need to parse it differently.

Let me reconsider. The parts can be:
- Together: "1h30m" - multiple <number><unit> concatenated
- Separated by spaces: "1h 30m"

So I need to parse the entire string as a sequence of <number><unit> tokens, where the separators between tokens are either nothing or one or more spaces.

Better approach: Use a regex to find all tokens in the string.

The overall pattern would be: after stripping, the string should match a sequence of `\d+[dhms]` tokens separated by optional spaces.

Let me use: `re.findall(r'\d+[dhms]', stripped)` - but I also need to verify there's nothing else in the string.

Actually, let me use a different approach:
1. Strip the string
2. Use `re.fullmatch` with a pattern that allows the tokens to be concatenated or space-separated
3. Or: find all tokens with `re.finditer` and verify the entire string is consumed (no gaps)

Let me think about this more carefully:

The valid string (after stripping) is a sequence of tokens where each token is `\d+[dhms]`, and between tokens there are either 0 or 1+ spaces.

I can use: `re.fullmatch(r'(?:\d+[dhms])(?: +\d+[dhms])*', stripped)`

Wait, but that doesn't handle the case where tokens are directly adjacent. Let me reconsider.

Actually, the tokens are always directly adjacent or separated by spaces. So the pattern is:
- One or more tokens
- Between tokens: either nothing (directly adjacent) or one or more spaces

So: `(?:\d+[dhms])(?:(?: +\d+[dhms])|(?=\d))` - hmm this is getting complicated.

Simpler: Let me just find all tokens and verify they cover the entire string.

```python
tokens = re.findall(r'\d+[dhms]', stripped)
# Verify that the tokens account for the entire string
# Reconstruct: join tokens with check that gaps are only spaces
```

Actually, let me think differently. I'll use `re.finditer` to find all token matches, then verify:
1. The first match starts at position 0
2. The last match ends at position len(stripped)
3. Between consecutive matches, the gap is only spaces (or zero)

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")
    
    pattern = re.compile(r'\d+[dhms]')
    matches = list(pattern.finditer(stripped))
    
    if not matches:
        raise ValueError("no valid tokens")
    
    # Check first match starts at 0
    if matches[0].start() != 0:
        raise ValueError("invalid start")
    
    # Check last match ends at len(stripped)
    if matches[-1].end() != len(stripped):
        raise ValueError("invalid end")
    
    # Check gaps between matches are only spaces
    for i in range(1, len(matches)):
        gap = stripped[matches[i-1].end():matches[i].start()]
        if gap and not gap.isspace():
            raise ValueError(f"invalid separator: {gap}")
        # Actually, gap should be spaces only (not tabs, etc.)
        if gap and not all(c == ' ' for c in gap):
            raise ValueError(f"invalid separator: {gap}")
    
    # Now validate order and uniqueness
    units_order = ['d', 'h', 'm', 's']
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = []
    total = 0
    
    for m in matches:
        token = m.group()
        unit = token[-1]
        num = int(token[:-1])
        
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        
        if seen:
            if units_order.index(unit) <= units_order.index(seen[-1]):
                raise ValueError(f"wrong order")
        
        seen.append(unit)
        total += num * unit_seconds[unit]
    
    return total
```

Wait, there's an issue. `re.findall(r'\d+[dhms]', stripped)` - what about "12h30m"? The regex would match "12h" and "30m". Good.

What about "12h30m"? Let me trace: `\d+[dhms]` would match "12h" (greedy \d+ takes "12", then [dhms] takes "h"), then "30m". Good.

What about "12345s"? Matches "12345s". Good.

What about "1.5h"? `\d+[dhms]` would match "1" then... wait, `\d+` matches "1", then `[dhms]` needs to match "." - no, "." is not in [dhms]. So it would try to match starting at "1" - `\d+` = "1", `[dhms]` = "." - fails. Then try starting at "5" - `\d+` = "5", `[dhms]` = "h" - matches "5h". But the full string is "1.5h" and the match "5h" doesn't start at 0, so we'd get a ValueError. Good.

What about "1h 30m"? Matches: "1h" at pos 0, "30m" at pos 4. Gap between: " " (space). Valid. Good.

What about "1h\t30m"? Matches: "1h" at pos 0, "30m" at pos 4. Gap: "\t". Not all spaces → ValueError. Good.

What about "1h30m45s"? Matches: "1h", "30m", "45s". No gaps. Order: h, m, s - correct. Good.

What about "1m30s"? Matches: "1m", "30s". Order: m, s - correct. Good.

What about "30s1m"? Matches: "30s", "1m". Order: s, m - wrong (s index 3 > m index 2). ValueError. Good.

What about "1h1h"? Matches: "1h", "1h". Repeated unit 'h'. ValueError. Good.

What about "123"? No match → ValueError. Good.

What about "h"? No match (needs digits before unit) → ValueError. Good.

What about "+1h"? The regex won't match at position 0 because "+" isn't a digit. First match would be "1h" at position 1, which doesn't start at 0 → ValueError. Good.

What about "1H"? The regex `[dhms]` is lowercase only, so "1H" won't match → ValueError. Good.

What about " 1h  "? Stripped = "1h". Works fine. Good.

What about "1h   30m"? Stripped = "1h   30m". Matches: "1h" at 0, "30m" at 5. Gap: "   " (3 spaces). All spaces. Valid. Good.

I think this solution is correct. Let me also handle the edge case where `stripped` is just spaces - but we already check `if not stripped` after strip, so that's covered.

One more thing: what about a string like "1h30m " (trailing space)? After strip, it's "1h30m". Works fine.

What about " 1h 30m " (leading and trailing spaces)? After strip, "1h 30m". Works fine.

I think the solution is solid. Let me finalize it.
