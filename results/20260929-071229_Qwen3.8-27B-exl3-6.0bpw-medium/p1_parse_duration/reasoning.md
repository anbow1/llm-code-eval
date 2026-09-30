Let me analyze the requirements carefully:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` parts
3. Units: d (86400s), h (3600s), m (60s), s (1s)
4. Units must appear in order: d, h, m, s (each at most once, any subset)
5. Parts can be together ("1h30m") or separated by spaces ("1h 30m")
6. Leading/trailing whitespace allowed
7. No normalization needed
8. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. Each part must match pattern: digits followed by a single unit character
5. Validate the sequence of units is in order d, h, m, s with no repeats

Let me think about the regex approach:
- Each part: `^\d+[dhms]$`
- But I need to validate the order across parts

Let me think step by step:

1. Strip the string
2. If empty, raise ValueError
3. Split by one or more spaces: `s.split()`  (this handles multiple spaces and leading/trailing)
4. For each part, check it matches `^\d+[dhms]$`
5. Extract the unit from each part
6. Check units are in valid order (d before h before m before s) and no repeats

Wait, I need to be careful. The parts are separated by spaces, but within a part there's no space. So "1h30m" is one part with two unit specifications? No wait, re-reading:

"A part is <non-negative integer><unit>"
"Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")"

So "1h30m" is two parts written together: "1h" and "30m". And "1h 30m" is two parts separated by space.

So I need to parse the string into individual `<number><unit>` tokens, where tokens can be adjacent or space-separated.

Approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex to find all tokens: `\d+[dhms]`
4. But I also need to make sure there's nothing else in the string (no other characters except spaces between tokens)

Let me think more carefully:
- After stripping, the string should consist of tokens (digits+unit) separated by optional spaces
- So the pattern for the whole string would be: `^\d+[dhms](\s+\d+[dhms])*` or `^\d+[dhms](\s*\d+[dhms])*`

Wait, but "other separators" should raise ValueError. So only spaces are valid separators.

Let me use a regex to validate the entire string first, then extract tokens:

Pattern: `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$`

But wait, I also need to handle the case where there are no spaces between parts: "1h30m". In this case, the string is just "1h30m" which matches `\d+[dhms]\d+[dhms]`.

So the overall pattern should be:
`^\s*(\d+[dhms])(\s*\d+[dhms])*\s*$`

But this would also match "1h  30m" (multiple spaces) which is allowed.

Actually, let me reconsider. The parts are `<number><unit>` and they can be:
- Written together: "1h30m" → tokens "1h", "30m"
- Separated by one or more spaces: "1h 30m" → tokens "1h", "30m"

So the valid string pattern is: one or more tokens, where tokens are separated by zero or more spaces (but if separated, at least one space).

Actually, let me just use: `^\s*(\d+[dhms])(\s*\d+[dhms])*\s*$`

This allows:
- "1h30m" → matches
- "1h 30m" → matches
- "1h  30m" → matches
- " 1h30m " → matches (leading/trailing whitespace)

But it would NOT match:
- "" → no match
- " " → no match (after strip it's empty)
- "1h30x" → no match
- "1h 30m extra" → no match
- "1.5h" → no match
- "-1h" → no match
- "1H" → no match
- "1" → no match (no unit)
- "h" → no match (no number)

Wait, "1h 30m extra" - "extra" doesn't match `\d+[dhms]` so the overall regex won't match. Good.

But what about "1h 30m " (trailing space)? The `\s*$` handles that.

What about "1h\t30m"? The `\s*` would match tabs too. But the requirement says "separated by one or more spaces". Does "spaces" mean only space characters or any whitespace? The requirement says "other separators" raise ValueError. I think tabs might be considered "other separators". Let me re-read.

"Parts may be written together ("1h 30m") or separated by one or more spaces"
"other separators" raise ValueError

I think "spaces" here means space characters specifically. But "Leading/trailing whitespace is allowed" - this says whitespace, not just spaces.

Hmm, this is a bit ambiguous. Let me be safe and use `\s` for leading/trailing whitespace but only space for separators between parts. Actually, re-reading: "separated by one or more spaces" - I'll interpret this as space characters only. And "Leading/trailing whitespace is allowed" means any whitespace.

Actually, let me just use `\s` everywhere to be safe. The "other separators" likely refers to things like commas, hyphens, etc. Tabs and newlines are still whitespace.

Let me go with:
- Strip the string (removes all leading/trailing whitespace)
- If empty, raise ValueError
- Use regex: `^(\d+[dhms])(\s*\d+[dhms])*$` on the stripped string

Wait, but if I strip first, then I don't need leading/trailing `\s*` in the regex.

Let me refine:
1. `s = s.strip()`
2. If `s == ''`, raise ValueError
3. Match against `^(\d+[dhms])(\s*\d+[dhms])*$`
4. If no match, raise ValueError
5. Extract all tokens using `re.findall(r'\d+[dhms]', s)`
6. Validate unit order

For step 6, I need to check:
- Units are in order d, h, m, s
- No unit appears more than once

I can assign a rank: d=0, h=1, m=2, s=3
Check that ranks are strictly increasing.

Let me also consider: what about very large numbers? Python handles big integers natively, so no issue.

What about "0s"? That's valid - non-negative integer includes 0.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Validate overall structure
    if not re.fullmatch(r'(\d+[dhms])(\s*\d+[dhms])*', s):
        raise ValueError(f"Invalid duration format: {s!r}")
    
    # Extract tokens
    tokens = re.findall(r'\d+[dhms]', s)
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    prev_order = -1
    
    for token in tokens:
        num_str = token[:-1]
        unit = token[-1]
        
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Units out of order or repeated: {s!r}")
        prev_order = order
        
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. `re.fullmatch(r'(\d+[dhms])(\s*\d+[dhms])*', s)` 

For "1h30m": 
- First group: "1h"
- Then `(\s*\d+[dhms])*` matches "30m" (with `\s*` matching empty string)
- ✓

For "1h 30m":
- First group: "1h"
- Then `(\s*\d+[dhms])*` matches " 30m"
- ✓

For "1h  30m":
- First group: "1h"
- Then `(\s*\d+[dhms])*` matches "  30m"
- ✓

For "1h30m " (trailing space): after strip it's "1h30m" ✓

For " 1h30m" (leading space): after strip it's "1h30m" ✓

For "1h 30m extra": 
- First group: "1h"
- `(\s*\d+[dhms])*` tries to match " 30m extra"
- " 30m" matches, then " extra" - `\s*` matches " ", then `\d+` fails on "e"
- So the * stops, and we're at " extra" which doesn't match the end
- fullmatch fails ✓

For "1.5h": `\d+` matches "1", then `[dhms]` fails on "." → no match ✓

For "-1h": `\d+` fails on "-" → no match ✓

For "1H": `[dhms]` fails on "H" → no match ✓

For "1": `[dhms]` fails (end of string) → no match ✓

For "h": `\d+` fails on "h" → no match ✓

For "1d2h3m4s": all in order ✓
For "1s2m": s before m → order violation ✓ (caught in the loop)
For "1h1h": repeated h → order violation ✓ (caught in the loop)

Looks good! Let me also consider edge cases:
- "0s" → 0 seconds ✓
- "0d" → 0 seconds ✓
- "90m" → 5400 seconds ✓

I think this solution is correct. Let me finalize it.
