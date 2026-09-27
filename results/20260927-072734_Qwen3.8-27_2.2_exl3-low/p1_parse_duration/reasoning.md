Let me analyze the requirements:

1. Parse a duration string like "1d2h30m45s" or "1h 30m"
2. Units: d (86400), h (3600), m (60), s (1)
3. Parts are `<non-negative integer><unit>` with no space between number and unit
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Parts can be together or separated by one or more spaces
7. Leading/trailing whitespace allowed
8. No normalization - "90m" is valid
9. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by whitespace (one or more spaces) to get parts
- Each part must match pattern: `<digits><unit>` where unit is one of d, h, m, s
- Check that units are in correct order (d, h, m, s)
- Check no repeated units
- Convert to total seconds

Let me think about edge cases:
- "1h 30m" → split by spaces → ["1h", "30m"] → valid
- "1h30m" → no spaces → single part "1h30m" → need to parse this as multiple parts
- Wait, parts can be written together. So "1h30m" is a single token but contains two parts.

So I need to parse each "token" (after splitting by whitespace) into individual `<number><unit>` pairs.

Actually, let me reconsider. The format is:
- Parts are `<non-negative integer><unit>`
- Parts may be written together or separated by spaces

So "1h30m" is two parts written together. I need to extract all `<number><unit>` pairs from the string.

Approach:
1. Strip the string
2. If empty, raise ValueError
3. Use regex to find all occurrences of `\d+[dhms]` in the string (after removing spaces)
4. Actually, I should validate that the entire string (ignoring spaces) consists of valid parts

Let me use a regex approach:
- After stripping, split by whitespace to get tokens
- Each token should be a sequence of `<digits><unit>` pairs
- Collect all (number, unit) pairs in order
- Validate: units in correct order, no repeats, all valid units

Let me think more carefully:

The string after stripping should consist of digits and units (d, h, m, s) separated by optional spaces. The pattern for the whole string (ignoring spaces) should be a sequence of `<digits><unit>` pairs.

Let me use a regex: `^(\d+[dhms])(\d+[dhms])*...` - actually it's simpler to just match all `\d+[dhms]` and verify the entire non-space content is consumed.

Plan:
1. Strip the string
2. If empty, raise ValueError
3. Remove all spaces (or split by spaces and concatenate)
4. Use regex to find all matches of `\d+[dhms]`
5. Verify that the concatenation of all matches equals the non-space string (ensures no invalid characters)
6. Check order and uniqueness of units
7. Compute total seconds

Wait, I need to be more careful. Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the format is: whitespace* (part (whitespace+ part)*) whitespace*

Where each part is `\d+[dhms]`.

Let me use a regex for the whole string:
`^\s*(\d+[dhms])(\s+(\d+[dhms]))*\s*$`

Actually, let me just:
1. Strip
2. If empty, ValueError
3. Use regex to find all `\d+[dhms]` in the stripped string
4. Check that the stripped string, with all spaces removed, equals the concatenation of all matches
5. Validate unit order and uniqueness

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Find all <digits><unit> patterns
    matches = re.findall(r'\d+[dhms]', s)
    
    # Verify the entire string (minus spaces) is composed of these matches
    non_space = s.replace(' ', '')
    if non_space != ''.join(matches):
        raise ValueError("invalid format")
    
    # Extract (number, unit) pairs
    parts = [(int(m[:-1]), m[-1]) for m in matches]
    
    # Check unit order: d, h, m, s
    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    prev_idx = -1
    for num, unit in parts:
        idx = order[unit]
        if idx <= prev_idx:
            raise ValueError("wrong order or repeated unit")
        prev_idx = idx
    
    # Compute total seconds
    values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = sum(num * values[unit] for num, unit in parts)
    return total
```

Wait, let me check: "0" as a number - is "0s" valid? The spec says "non-negative integer", so yes, 0 is valid.

What about "0"? That's a number without a unit - should raise ValueError. My regex `\d+[dhms]` won't match "0" alone, so `non_space != ''.join(matches)` would catch it.

What about "1.5s"? The regex `\d+[dhms]` would match "1" and then "5s" - wait no. Let me think. "1.5s" - the regex `\d+[dhms]` would try to match. Starting at position 0: "1" is a digit, then "." is not a unit. So no match at position 0. At position 1: "." is not a digit. At position 2: "5s" matches. So matches = ["5s"], non_space = "1.5s", ''.join(matches) = "5s". They're not equal, so ValueError. Good.

What about "1.5s"? Actually wait - `\d+` is greedy. At position 0, `\d+` matches "1", then `[dhms]` needs to match "." - no. So no match starting at 0. At position 2, `\d+` matches "5", `[dhms]` matches "s". So matches = ["5s"]. non_space = "1.5s" ≠ "5s". ValueError. 

What about negative numbers like "-1s"? `\d+` won't match "-". So at position 0, no match. At position 1, "1s" matches. non_space = "-1s" ≠ "1s". ValueError. Good.

What about uppercase "1H"? `[dhms]` is lowercase only. "1H" - at position 0, `\d+` matches "1", `[dhms]` needs to match "H" - no. No match. non_space = "1H" ≠ "". ValueError. Good.

What about "1d2h3m4s"? matches = ["1d", "2h", "3m", "4s"], non_space = "1d2h3m4s" = "".join(matches). Units in order: d(0), h(1), m(2), s(3). All good. Total = 86400 + 7200 + 180 + 4 = 93784.

What about "1h 30m"? matches = ["1h", "30m"], non_space = "1h30m" = "".join(matches). Good.

What about "  1h  30m  "? After strip: "1h  30m". matches = ["1h", "30m"]. non_space = "1h30m". Good.

What about "1h  30m " with multiple spaces? After strip: "1h  30m". Works fine.

What about tabs? The spec says "one or more spaces". Hmm, should I handle tabs? The spec says "other separators" raise ValueError. So tabs should raise ValueError. Let me check: if there's a tab, `s.replace(' ', '')` won't remove it, so non_space would contain a tab, and it won't match. ValueError. Good.

Actually wait - I should only remove spaces (space character), not all whitespace. Let me use `s.replace(' ', '')` specifically. That handles the "other separators" case.

Hmm, but what about the initial strip? `s.strip()` removes all whitespace including tabs, newlines, etc. Should "1h\t30m" be valid? The spec says "separated by one or more spaces" and "other separators" raise ValueError. So tabs between parts should be invalid.

But `s.strip()` would remove leading/trailing tabs. The spec says "Leading/trailing whitespace is allowed." So leading/trailing whitespace (including tabs?) is allowed. But between parts, only spaces are allowed.

Let me reconsider: After stripping, if there are tabs in the middle, `s.replace(' ', '')` won't remove them, so the check will fail. Good.

Actually, I need to be more careful. What if the string is "1h\t30m"? After strip: "1h\t30m". `s.replace(' ', '')` = "1h\t30m". matches from regex = ["1h", "30m"]. ''.join(matches) = "1h30m" ≠ "1h\t30m". ValueError. Good.

What about newlines in the middle? Same logic - they won't be removed by `replace(' ', '')`, so it'll fail. Good.

I think my solution is correct. Let me also make sure the regex handles multi-digit numbers correctly. `\d+` matches one or more digits. "123s" → matches "123s". Good.

One more edge case: what if the string is just "0"? After strip: "0". matches = [] (no match since "0" has no unit). non_space = "0" ≠ "". ValueError. Good.

What about "0s"? matches = ["0s"]. non_space = "0s" = "".join(matches). parts = [(0, 's')]. Total = 0. Valid.

I think this is solid. Let me write the final version.
