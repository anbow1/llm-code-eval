Let me carefully design a `parse_duration` function that handles all the specified rules.

Rules:
1. Parts: <non-negative integer><unit> with NO space between number and unit
2. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
3. Order: d, h, m, s - each unit at most once
4. Parts can be together or separated by one or more spaces
5. Leading/trailing whitespace allowed
6. No normalization: "90m" is valid
7. Raises ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

First, I need to parse the string into parts. The parts can be:
- Together: "1h30m"
- Separated by spaces: "1h 30m"
- Mixed: "1h 30m 45s" or "1h30m 45s"

Strategy:
1. Strip leading/trailing whitespace
2. Check for empty/blank string
3. Split by whitespace to get tokens? No, because "1h30m" is one token but "1h 30m" is two tokens.

Better approach: Use a regex to find all parts. But I need to handle the case where there might be spaces between parts.

Let me think about this differently:
- Remove spaces first? No, that would break validation.
- Actually, spaces between parts are separators. So I can split by whitespace to get tokens, then validate each token is a valid part, and check ordering across tokens.

Wait, but "1h30m" is a single token that contains two parts. So I need to parse within each token too.

Approach:
1. Strip the string. If empty, raise ValueError.
2. Split by one or more spaces to get tokens.
3. For each token, parse it into parts using regex or manual parsing.
4. Collect all parts in order.
5. Validate: each unit appears at most once, order is d, h, m, s.
6. Compute total seconds.

For parsing a single token like "1h30m":
- Use regex to find all occurrences of `(\d+)([dhms])`
- But I need to make sure the entire token is consumed by these matches. If there's anything left over (like a decimal point, sign, unknown character), raise ValueError.

Let me think about the regex more carefully:
- Pattern for a part: `(\d+)([dhms])`
- But I need to ensure NO other characters are in the token.

Actually, let me use a more careful approach:
- For each token, try to match the entire token as a sequence of parts.
- Pattern: `^(\d+[dhms])+$`
- But this doesn't prevent things like "00h" (leading zeros are fine - it's a non-negative integer).

Wait, what about "0h"? That's valid - 0 hours. What about "00h"? Also valid - it's the integer 0.

What about signs? "+5h" or "-5h" - should raise ValueError. My regex `\d+` won't match signs, so "+5h" won't fully match the pattern.

What about decimals? "1.5h" - the "." won't be matched by `\d+[dhms]`, so it'll fail.

What about uppercase? "5H" - won't match `[dhms]`.

What about unknown units? "5x" - won't match.

What about "number without unit"? "5" - won't match `(\d+[dhms])+$`.

What about "missing number"? "h" - won't match.

What about other separators like commas, tabs, etc.?
- Tabs: the problem says "separated by one or more spaces". So tabs should be invalid. I should split only on spaces, not all whitespace.
- But leading/trailing whitespace... hmm, the problem says "Leading/trailing whitespace is allowed." Does whitespace include tabs? Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

I think "whitespace" here means spaces specifically. But to be safe, I'll strip with `.strip()` which handles all whitespace for leading/trailing, but for separators between parts, only spaces are valid.

Wait, actually let me re-read: "other separators" should raise ValueError. So tabs between parts should raise ValueError. Let me use `split(' ')` rather than `.split()` (which splits on any whitespace).

Actually, `.strip()` removes all whitespace from ends. Then I split by spaces. If there are tabs in the middle, they'll be in a token and fail the regex match.

Let me refine:
1. `s.strip()` - remove leading/trailing whitespace
2. If result is empty, raise ValueError
3. Split by `' '` (single space). This will give empty strings if there are multiple spaces.
4. Filter out empty strings from the split (multiple spaces are OK between parts).
5. For each non-empty token, validate it matches the parts pattern.
6. Collect all (unit, value) pairs.
7. Validate ordering and uniqueness.
8. Compute total.

Wait, what about tabs? If the input is "1h\t30m", after strip it's "1h\t30m". Split by ' ' gives ["1h\t30m"]. This token won't match the regex because of the tab. Good, it'll raise ValueError.

What about "1h\n30m"? After strip, still "1h\n30m". Split by ' ' gives ["1h\n30m"]. Won't match. Good.

But what about "1h  30m" (two spaces)? Split by ' ' gives ["1h", "", "30m"]. Filter empty strings: ["1h", "30m"]. Good.

What about " 1h " (spaces around)? After strip: "1h". Split by ' ': ["1h"]. Good.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    UNIT_ORDER = ['d', 'h', 'm', 's']
    
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")
    
    # Split by spaces, filter out empty strings (handles multiple spaces)
    tokens = stripped.split(' ')
    tokens = [t for t in tokens if t]
    
    if not tokens:
        raise ValueError("empty or blank string")
    
    # Parse each token into parts
    all_parts = []  # list of (unit, value)
    
    part_pattern = re.compile(r'(\d+)([dhms])')
    
    for token in tokens:
        pos = 0
        while pos < len(token):
            match = part_pattern.match(token, pos)
            if not match:
                raise ValueError(f"invalid part: {token}")
            value_str = match.group(1)
            unit = match.group(2)
            value = int(value_str)
            all_parts.append((unit, value))
            pos = match.end()
    
    # Validate ordering and uniqueness
    seen_units = set()
    last_order_index = -1
    
    for unit, value in all_parts:
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        seen_units.add(unit)
        order_index = UNIT_ORDER.index(unit)
        if order_index <= last_order_index:
            raise ValueError("wrong order")
        last_order_index = order_index
    
    # Compute total seconds
    total = sum(value * UNIT_SECONDS[unit] for unit, value in all_parts)
    return total
```

Wait, let me think about edge cases:
- "0s" → 0 seconds. Valid.
- "0d0h0m0s" → 0. Valid.
- "00h" → 0 hours. Valid (non-negative integer with leading zeros).
- "h" → no number. My regex requires `\d+` so it won't match. ValueError. ✓
- "5" → number without unit. My regex requires a unit character. ValueError. ✓
- "1h5x" → unknown unit 'x'. My regex won't match 'x'. ValueError. ✓
- "1h 1h" → repeated unit. Caught by uniqueness check. ✓
- "1m1h" → wrong order. Caught by order check. ✓
- "+5h" → won't match because regex starts at pos 0 and `\d+` doesn't match '+'. ValueError. ✓
- "-5h" → same. ValueError. ✓
- "1.5h" → at pos 0, matches "1" then "." is not [dhms]. Wait, `\d+` is greedy, so it matches "1", then expects `[dhms]` but finds ".". So match fails. ValueError. ✓

Hmm wait, actually let me reconsider "1.5h". The regex `(\d+)([dhms])` starting at position 0: `\d+` matches "1", then `[dhms]` needs to match ".", which it doesn't. So the match fails. Good.

But what about "1h.5m"? At pos 0: matches "1h", pos becomes 2. At pos 2: "." is not matched by `\d+`. ValueError. ✓

What about "1H"? `\d+` matches "1", `[dhms]` doesn't match "H". ValueError. ✓

What about "5h2d"? Parsed as [("h",5), ("d",2)]. Order check: h is index 1, d is index 0. 0 <= 1 is True... wait no. Let me re-check.

UNIT_ORDER = ['d', 'h', 'm', 's'], so d=0, h=1, m=2, s=3.

"5h2d": first part is ('h', 5), order_index = 1. last_order_index becomes 1. Second part is ('d', 2), order_index = 0. 0 <= 1 is True → wrong order. ✓

What about "2d3d"? First part ('d', 2), order_index = 0. Second part ('d', 3), already in seen_units → repeated. ✓

What about "1h30m 45s"? Tokens: ["1h30m", "45s"]. First token gives [('h',1), ('m',30)]. Second token gives [('s',45)]. Order: h(1), m(2), s(3) - increasing. Valid. Total = 3600 + 1800 + 45 = 5445. ✓

What about "1h 30m"? Same result. ✓

What about empty string ""? After strip, still "". Raises ValueError. ✓
What about "   "? After strip, "". Raises ValueError. ✓

What about "1h\t30m"? After strip: "1h\t30m". Split by ' ': ["1h\t30m"]. Token "1h\t30m": matches "1h" at pos 0, pos=2. At pos 2: "\t" doesn't match `\d+`. ValueError. ✓

What about tabs as separators? "1h\t\t30m" → same issue, ValueError. ✓

Looks good. Let me also consider: what if the string is just spaces after stripping but before splitting? Like "  " → strip → "" → ValueError. ✓

One more: what about "0"? Number without unit. Token "0": regex needs `(\d+)([dhms])`, `\d+` matches "0" but then there's nothing for `[dhms]`. Match fails. ValueError. ✓

What about very large numbers like "999999999999d"? Python handles big integers natively. Should be fine.

I think the solution is solid. Let me also make sure I'm not missing the "other separators" case. The problem mentions commas, etc. Since I only split by space, a comma would be part of a token and fail the regex. E.g., "1h,30m" → token "1h,30m" → after matching "1h", pos=2, "," doesn't match `\d+`. ValueError. ✓

I'm satisfied with this solution. Let me write the final clean version.
