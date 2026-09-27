Let me analyze the requirements carefully:

1. Parse duration strings like "1d4h2m30s", "1h30m", "45s", "1d4s"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order: d, h, m, s - each at most once
4. Parts can be together or separated by spaces (one or more)
5. Leading/trailing whitespace allowed
6. No normalization - "90m" is valid
7. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- The string can have spaces between parts, so I can split by spaces to get parts, OR I can use regex to find all `<number><unit>` tokens

Wait, but spaces can be between parts. Let me think about this more carefully.

Actually, the simplest approach: 
1. Strip the string
2. If empty, raise ValueError
3. Split by whitespace (one or more spaces) to get tokens
4. Each token must be `<digits><unit>` where unit is one of d, h, m, s
5. Check that units are in order and no repeats

Wait, but what about "1h  30m" (multiple spaces)? Splitting by whitespace handles that.

What about "1h30m"? That's one token "1h30m" - but that's two parts together. So I can't just split by spaces and expect each part to be one unit.

Better approach: Use regex to find all matches of `<digits><unit>` in the string, but also validate that the entire string (after stripping) is composed of these parts optionally separated by spaces.

Let me use a regex approach:
- After stripping, the string should match: `^\d+[dhms](\s+\d+[dhms])*$`

Wait, but I also need to validate the order. Let me first extract all parts, then validate order.

Let me use `re.findall` or `re.fullmatch`:

Pattern: `^\d+[dhms](?:\s+\d+[dhms])*$`

This ensures:
- The string starts with digits followed by a unit
- Optionally followed by (whitespace + digits + unit) one or more times
- Nothing else

But wait, this doesn't prevent "1d4s" from matching as "1d" and "4s" - actually it does! Because "1d4s" would be parsed as "1d" followed by... hmm, no. The regex `\d+[dhms]` is greedy, so `\d+` would match "1" and `[dhms]` would match "d", then `(?:\s+\d+[dhms])*` would try to match "4s" but there's no space before it.

So "1d4s" would NOT match `^\d+[dhms](?:\s+\d+[dhms])*$` because after matching "1d", the remaining "4s" doesn't start with whitespace.

But the problem says "1d4s" is valid! So parts CAN be written together without spaces.

So I need a different approach. Let me use `re.findall` to find all `<digits><unit>` patterns, but I need to ensure the entire string is accounted for.

Actually, let me think differently. The string after stripping should be fully consumed by a sequence of `<digits><unit>` tokens, where tokens may be separated by zero or more spaces (but if spaces exist, they separate tokens).

Wait, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So "1h30m" is valid - the parts are "1h" and "30m" written together.
And "1h 30m" is also valid - same parts separated by space.

So the approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex to find all `\d+[dhms]` tokens
4. Verify that the string is composed of these tokens optionally separated by spaces (one or more)
5. Check unit order and uniqueness

For step 4, I can use a pattern like: `^\d+[dhms](?:\s*\d+[dhms])*$`

Wait, but that would allow "1h  30m" (multiple spaces) and "1h30m" (no space). Let me check:
- `^\d+[dhms](?:\s*\d+[dhms])*$` - this allows zero or more spaces between parts.

But wait, would this match "1h30m"? Let's see:
- `\d+[dhms]` matches "1h" (greedy: `\d+` matches "1", `[dhms]` matches "h")
- Then `(?:\s*\d+[dhms])*` tries to match "30m": `\s*` matches "", `\d+` matches "30", `[dhms]` matches "m". Yes!

What about "1h  30m"?
- `\d+[dhms]` matches "1h"
- `\s*` matches "  ", `\d+` matches "30", `[dhms]` matches "m". Yes!

What about "1h x30m"?
- `\d+[dhms]` matches "1h"
- `\s*` matches " ", then `\d+` would need to match "x30m" - no, it fails.
- So the overall match fails. Good.

What about "123"?
- `\d+[dhms]` - `\d+` matches "123" but then `[dhms]` needs a character - fails.
- So "123" alone would fail. Good, that's "number without unit".

What about "1h2"?
- `\d+[dhms]` matches "1h"
- Then `(?:\s*\d+[dhms])*` tries "2": `\s*` matches "", `\d+` matches "2", but `[dhms]` fails.
- So the group matches zero times, and `*$` requires end of string, but "2" remains. Fails. Good.

What about "1dh"?
- `\d+[dhms]` - greedy: `\d+` matches "1", `[dhms]` matches "d". 
- Then `(?:\s*\d+[dhms])*` tries "h": `\s*` matches "", `\d+` needs at least one digit - fails.
- So "1dh" fails. Good - that's "missing number" for the second part.

Wait, what about "1dh" - is that "missing number"? The first part is "1d", then "h" has no number. Yes, that should be ValueError.

What about "1d1h"?
- `\d+[dhms]` matches "1d"
- `(?:\s*\d+[dhms])*` matches "1h"
- Overall match. Then I check order: d before h - correct.

What about "1h1d"?
- Matches the regex. Then I check order: h before d - wrong order! ValueError.

What about "1d1d"?
- Matches the regex (first part "1d", second part "1d"). Then I check: repeated unit d. ValueError.

What about "1D"?
- `[dhms]` is lowercase only, so "D" won't match. Fails. Good.

What about "1.5h"?
- `\d+` matches "1", then `[dhms]` needs to match "." - fails.
- Overall fails. Good - decimals not allowed.

What about "-1h"?
- `\d+` can't match "-". Fails. Good - no signs.

What about "1h m"?
- `\d+[dhms]` matches "1h"
- `(?:\s*\d+[dhms])*` tries " m": `\s*` matches " ", `\d+` needs a digit but gets "m" - fails.
- So the group matches zero times, `*$` requires end but " m" remains. Fails. Good.

What about "1h  m"?
- Same as above. Fails. Good.

What about "1h-30m"?
- `\d+[dhms]` matches "1h"
- `(?:\s*\d+[dhms])*` tries "-30m": `\s*` matches "", `\d+` needs digit but gets "-" - fails.
- Fails. Good - other separators.

What about "1h_30m"?
- Similar to above. Fails. Good.

Now, one edge case: what about "0s"? That's valid - 0 seconds. `\d+` matches "0", `[dhms]` matches "s". Good.

What about "00h"? That's valid too - 0 hours. `\d+` matches "00", `[dhms]` matches "h". Good.

Let me also think about: what if there's a space at the start of a part? Like "1h 30m" vs "1h  30m" - both should work with `\s*`.

Wait, I said `\s*` but the problem says "one or more spaces" for separation. If parts are together, there's no space. If separated, it's one or more spaces. So `\s*` (zero or more) covers both cases. But wait, should a single space between parts be valid? "1h 30m" - yes, that's "one space" which is "one or more spaces". And "1h30m" is "no space" (together). So `\s*` is correct.

But wait, should "1h  30m" (two spaces) be valid? The problem says "separated by one or more spaces". So yes, multiple spaces are fine. `\s*` handles this.

Actually, I realize I should be more careful. `\s` matches not just spaces but also tabs, newlines, etc. The problem says "one or more spaces". Let me re-read...

"Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

And "other separators" cause ValueError. So I think only spaces (not tabs, newlines, etc.) should be allowed as separators. Let me use ` *` (zero or more space characters) instead of `\s*`.

Wait, but leading/trailing whitespace is allowed. So I strip first, then the internal separators should be spaces only.

Hmm, but what counts as "whitespace" for leading/trailing? The problem says "Leading/trailing whitespace is allowed." I'll use `.strip()` which handles all whitespace.

For internal separators, I'll use ` *` (literal spaces only) to be safe. Actually, re-reading the problem: "separated by one or more spaces". I think spaces specifically. Let me use ` *`.

Let me refine my regex: `^\d+[dhms]( *\\d+[dhms] *)*$`

Wait no, that's not right either. Let me think again.

The structure is: `<part>(<sep><part>)*` where `<part>` is `\d+[dhms]` and `<sep>` is ` +` (one or more spaces) OR nothing (parts together).

Actually, it's simpler: the string is a sequence of parts, where between consecutive parts there are zero or more spaces. So:

`^\d+[dhms]( *\d+[dhms])*$`

This says: start with a part, then zero or more (zero-or-more-spaces + part).

Let me verify:
- "1h30m": "1h" + "30m" (zero spaces between) ✓
- "1h 30m": "1h" + " 30m" (two spaces) ✓
- "1h  30m": "1h" + "  30m" ✓
- "1h30m ": stripped first, so this becomes "1h30m" ✓

This looks correct.

Now for the algorithm:
1. Strip the string
2. If empty, raise ValueError
3. Use `re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', s)` - if no match, raise ValueError
4. Use `re.findall(r'(\d+)([dhms])', s)` to extract (number, unit) pairs
5. Validate:
   a. Units are in order d, h, m, s (each at most once)
   b. This is implicitly checked by finding all matches and verifying their sequence
6. Compute total seconds

Wait, step 4 with findall on the stripped string should work because we've already validated the format.

Actually, let me use a different approach for step 4. Since the fullmatch already validates the format, I can use findall to extract the parts:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty string")
    
    pattern = r'\d+[dhms]( *\d+[dhms])*'
    if not re.fullmatch(pattern, s):
        raise ValueError(f"invalid duration: {s!r}")
    
    parts = re.findall(r'(\d+)([dhms])', s)
    
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    prev_order = -1
    seen_units = set()
    
    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        if unit_order[unit] <= prev_order:
            raise ValueError(f"wrong order: {unit}")
        seen_units.add(unit)
        prev_order = unit_order[unit]
        total += int(num_str) * unit_values[unit]
    
    return total
```

Wait, let me double-check with the test cases:
- "2d" → 172800 ✓
- "1h30m" → 5400 ✓
- "45s" → 45 ✓
- "1d4s" → 86404 ✓
- "90m" → 5400 ✓
- "1h 30m" → 5400 ✓

Error cases:
- "" → ValueError (empty)
- "   " → ValueError (blank)
- "1x" → ValueError (unknown unit, regex fails)
- "1h1d" → ValueError (wrong order)
- "1d1d" → ValueError (repeated unit)
- "h" → ValueError (missing number, regex fails)
- "123" → ValueError (number without unit, regex fails)
- "1.5h" → ValueError (decimals, regex fails)
- "-1h" → ValueError (signs, regex fails)
- "1H" → ValueError (uppercase, regex fails)
- "1h-30m" → ValueError (other separator, regex fails)
- "1h_30m" → ValueError (other separator, regex fails)

Looks good! Let me also consider:
- "0d" → 0, valid
- "0h0m0s" → 0, valid
- "1000s" → 1000, valid (no normalization)

One more thing: the problem says "empty or blank string" should raise ValueError. "blank" means all whitespace. After `.strip()`, if it's empty, we raise. Good.

Let me also make sure the regex handles the case where there's only one part: "45s" → `\d+[dhms]` matches "45s", then `( *\d+[dhms])*` matches zero times. ✓

I think this solution is correct. Let me write the final version.
