Let me carefully analyze the requirements for this `parse_duration` function:

1. **Format**: A duration string consists of parts, each being `<non-negative integer><unit>` with no space between number and unit.
2. **Units**: d (86400s), h (3600s), m (60s), s (1s). Lowercase only.
3. **Order**: Units must appear in order d, h, m, s. Each unit at most once.
4. **Separators**: Parts can be together ("1h30m") or separated by one or more spaces. Leading/trailing whitespace allowed.
5. **No normalization**: "90m" is valid (5400s).
6. **Error cases**: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Let me think about the parsing approach:

1. Strip leading/trailing whitespace.
2. If empty after strip, raise ValueError.
3. The string can have spaces between parts. I need to handle both "1h30m" and "1h 30m" and "1h  30m".

Approach: I'll tokenize the string. The valid characters are digits (0-9), spaces, and lowercase units (d, h, m, s). Anything else (decimals, signs, uppercase, other chars) should raise ValueError.

Let me think about parsing more carefully:

- Strip the string.
- If empty, ValueError.
- I need to split by one or more spaces, then each token should match `<non-negative integer><unit>`.
- But wait, "1h30m" has no spaces - so I can't just split by spaces.

Better approach: Use a regex to match the entire string pattern.

The pattern for a part is: `\d+[dhms]`
The full string is: optional leading spaces, then parts separated by one or more spaces, with optional trailing spaces.

Actually, let me think again. Parts can be "written together" ("1h30m") or "separated by one or more spaces". So the separator between parts is either nothing or one-or-more spaces.

Pattern: `^\s*(\d+[dhms](\s*\d+[dhms])*)\s*$`

Wait, but I need to be careful. The spaces can only be between parts, not within a part. So:

`^\s*(\d+[dhms])((\s+)\d+[dhms])*\s*$`

Hmm, actually "parts may be written together or separated by one or more spaces". So between two parts, there's either zero spaces or one-or-more spaces. That means the separator is `\s*` (zero or more spaces) between parts.

Wait, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the separator between parts is `\s*` (zero or more whitespace). But we also need to allow leading/trailing whitespace.

Let me use a regex approach:

1. Strip leading/trailing whitespace.
2. If empty, ValueError.
3. Match the pattern: `(\d+[dhms])(\s*\d+[dhms])*` for the whole stripped string.

Actually, let me think about this differently. After stripping:

- The entire string should match: `\d+[dhms](\s*\d+[dhms])*`

Wait, but this could also match things incorrectly. Let me think about edge cases:
- "1h30m" → matches as one part "1h" then "30m"
- "1h 30m" → matches as "1h" then space then "30m"
- "1h  30m" → matches as "1h" then two spaces then "30m"
- "1h30 m" → should this be valid? "30 m" has a space between number and unit. The rule says "NO space between number and unit". So this should be invalid.

The regex `(\d+[dhms])(\s*\d+[dhms])*` would NOT match "1h30 m" because after "1h" and "30", it expects a unit immediately after the digits. Let me verify:
- "1h30 m": after stripping, we try to match `(\d+[dhms])(\s*\d+[dhms])*`. 
  - First group: "1h" ✓
  - Then `(\s*\d+[dhms])*`: `\s*` matches "", `\d+` matches "30", then `[dhms]` needs to match but next char is " " → fails.
  - So the full match would be "1h30" but that's not the full string.
  
Hmm wait, `\d+` is greedy. "1h30 m" → first `(\d+[dhms])` matches "1h". Then `(\s*\d+[dhms])*` tries: `\s*` matches "", `\d+` matches "30", `[dhms]` tries to match " " → fails. So the regex only matches "1h", not the full string. Good, this would fail to match the full string.

But wait, what about "1h30m5s"? Let me check: first group matches "1h". Then `(\s*\d+[dhms])*`: first iteration: `\s*` matches "", `\d+` matches "30", `[dhms]` matches "m". Second iteration: `\s*` matches "", `\d+` matches "5", `[dhms]` matches "s". Full match is "1h30m5s". ✓

What about "0d"? That's a non-negative integer (0) with unit d. Should be valid, giving 0 seconds.

What about "0"? Number without unit → invalid. My regex requires a unit after digits. ✓

What about "h"? No number → invalid. My regex requires `\d+` before the unit. ✓

What about "1.5h"? Decimal → invalid. After stripping, the regex tries to match. `\d+` matches "1", then `[dhms]` tries to match "." → fails. The regex doesn't match the full string. ✓

What about "-1h"? Sign → invalid. `\d+` can't match "-", so the regex won't match. ✓

What about "1H"? Uppercase → invalid. `[dhms]` won't match "H". ✓

What about "1h2h"? Repeated unit → the regex matches, but we need to check for repeated units in post-validation. ✓

What about "2h1d"? Wrong order → regex matches, but we check order in post-validation. ✓

What about "1x"? Unknown unit → `[dhms]` won't match "x". ✓

What about "1 h"? Space between number and unit. After stripping "1 h", the regex `(\d+[dhms])(\s*\d+[dhms])*`: `\d+` matches "1", `[dhms]` tries to match " " → fails. Doesn't match full string. ✓

What about tabs or other whitespace? The problem says "one or more spaces". Let me re-read: "separated by one or more spaces". Hmm, but it also says "Leading/trailing whitespace is allowed". 

I think I should use `\s` for leading/trailing whitespace (which includes tabs, etc.) but for the separator between parts, the problem says "one or more spaces". Let me be strict and use literal space character for separators but `\s*` for leading/trailing.

Actually, re-reading: "Leading/trailing whitespace is allowed" and "separated by one or more spaces". I'll use `\s` for leading/trailing and literal space ` ` for between parts. Wait, but "parts may be written together" means zero spaces is also fine.

Let me use: `^\s*(\d+[dhms])(( )*\d+[dhms])*\s*$`

Hmm, actually I think using `\s` throughout is safer and more Pythonic. The problem likely just means "whitespace" when it says "spaces". Let me re-read: "separated by one or more spaces". I'll go with space character specifically for between-part separators to be strict, but `\s` for leading/trailing.

Actually, let me just use `\s` for everything. If the test cases use tabs between parts and expect it to work, using `\s` is safer. But if they use tabs and expect failure... The problem says "one or more spaces" which could mean literal space characters. Let me be strict: use ` ` (space) for between parts.

Wait, let me re-read more carefully: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

I think "spaces" here just means whitespace characters. I'll use `\s` for everything to be safe. Actually no, let me be strict about the between-parts separator being spaces only, since the problem specifically says "spaces" not "whitespace". But for leading/trailing it says "whitespace".

Hmm, I'll use `\s` for leading/trailing and ` ` for between parts. Actually, you know what, let me just use `\s` everywhere. It's the most common interpretation and likely what tests expect.

Wait, actually I just realized: "No normalization: '90m' is valid (5400)." This means we don't need to validate that minutes < 60, hours < 24, etc. Good.

Also: "Each unit at most once" - I need to check this.
"Units must appear in the order d, h, m, s" - I need to check this.

Let me also consider: what if the string is just whitespace like "   "? After stripping, it's empty → ValueError. ✓

What about "1h  30m"? Multiple spaces between parts → should be valid.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    UNIT_ORDER = ['d', 'h', 'm', 's']
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")
    
    # Match the full string
    pattern = r'^(\d+[dhms])(\s*\d+[dhms])*$'
    match = re.fullmatch(pattern, stripped)
    if not match:
        raise ValueError(f"Invalid format: {s}")
    
    # Extract parts
    # We need to extract all number+unit pairs
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    # Validate: check order and no repeats
    seen = set()
    last_order = -1
    total = 0
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        order = UNIT_ORDER.index(unit)
        if order <= last_order:
            raise ValueError(f"Units out of order")
        seen.add(unit)
        last_order = order
        total += int(num_str) * UNIT_SECONDS[unit]
    
    return total
```

Wait, I need to be more careful with the regex. The `re.findall` will extract all matches, but what if the string has characters between the matches that aren't whitespace? Actually, since I first check with `re.fullmatch`, the string is guaranteed to be a valid sequence of `\d+[dhms]` parts separated by optional whitespace.

But wait - there's an issue. What about "12h30m"? `re.findall(r'(\d+)([dhms])', stripped)` would give `[('12', 'h'), ('30', 'm')]`. ✓

What about "1h2s"? `[('1', 'h'), ('2', 's')]`. ✓

What about "1d2h3m4s"? `[('1', 'd'), ('2', 'h'), ('3', 'm'), ('4', 's')]`. ✓

What about "1h 30m"? After stripping, "1h 30m". The fullmatch pattern: `^(\d+[dhms])(\s*\d+[dhms])*$`. First group matches "1h". Then `(\s*\d+[dhms])` matches " 30m". ✓

Hmm wait, there's a subtle issue. What about "1h2s3m"? The regex will match (since it doesn't check order), but the order check will catch it because 's' comes before 'm'. ✓

What about "0"? The fullmatch pattern requires a unit after digits, so "0" won't match. ✓

What about ""? After strip, it's empty, we raise ValueError before the regex. ✓

What about "  "? After strip, empty. ✓

What about "1x"? The regex `[dhms]` won't match 'x'. The fullmatch fails. ✓

What about "1D"? `[dhms]` won't match 'D'. ✓

What about "1.5h"? The fullmatch: `(\d+[dhms])` tries to match "1" then `[dhms]` tries "." → fail. Actually `\d+` matches "1", then `[dhms]` tries to match "." which fails. So the first group fails. But wait, could `\d+` match "1" and then `[dhms]` not match, so the overall regex fails? Yes. But actually, let me reconsider. The pattern is `^(\d+[dhms])(\s*\d+[dhms])*$`. For "1.5h": `\d+` matches "1", `[dhms]` tries to match "." → fail. Backtrack: `\d+` can't match less than 1 digit... Actually regex backtracking: `\d+` will try to match as many as possible. For "1.5h", `\d+` matches "1", then `[dhms]` needs to match "." → fail. No more backtracking possible for `\d+`. So the match fails. ✓

What about "10h20m5s1d"? Regex matches but order check fails (d after s). ✓

What about "2d2d"? Repeated unit 'd'. Caught by `seen` check. ✓

Let me also think about: what if there are tabs? The problem says "spaces". I'll use `\s` which includes tabs. If the problem strictly means space character only, I could use ` ` instead. But I'll go with `\s` to be more permissive for leading/trailing and use ` ` for between parts... 

Actually, you know what, let me just use `\s` everywhere. The problem says "Leading/trailing whitespace is allowed" which implies `\s`. For between parts, it says "one or more spaces" but I think in context it means whitespace. If tests fail I'd change it, but `\s` is the safer default.

Let me also double-check: the problem says "No space between number and unit". My regex `\d+[dhms]` enforces this since there's no space allowed between `\d+` and `[dhms]`. ✓

One more edge case: what about just spaces in the string like "   1h   "? After strip: "1h". Matches. ✓

What about "1h   30m"? After strip: "1h   30m". The `(\s*\d+[dhms])*` part: `\s*` matches "   ", `\d+` matches "30", `[dhms]` matches "m". ✓

I think my solution is solid. Let me finalize it.

Actually, one more thought: should I handle the case where `s` is not a string? The type hint says `str`, so I'll assume it is.

Also: the problem says "empty or blank string" raises ValueError. My code handles this with the strip + empty check. ✓

Let me also make sure: "Anything else raises ValueError" - this means any invalid input should raise ValueError, which my code does.

Final solution looks good. Let me write it cleanly.
