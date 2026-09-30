Let me carefully analyze the requirements:

1. A part is `<non-negative integer><unit>` with NO space between number and unit.
2. Units: d (86400s), h (3600s), m (60s), s (1s). Lowercase only.
3. Units must appear in order d, h, m, s. Each unit at most once. Any subset allowed.
4. Parts may be together or separated by one or more spaces. Leading/trailing whitespace allowed.
5. No normalization needed.
6. Raises ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Approach:
- Strip leading/trailing whitespace.
- If empty after strip, raise ValueError.
- I need to parse the string character by character or with regex.

Let me think about the parsing strategy:

The string can have spaces between parts. So I could split by spaces, but the problem says "separated by one or more spaces". So splitting by one or more spaces gives me tokens. But wait - "1h30m" is a single token with no spaces. So I can't just split by space.

Better approach: iterate through the string, skipping spaces, and for each part, parse the number then the unit.

Algorithm:
1. Strip the string.
2. If empty, raise ValueError.
3. Walk through the string character by character:
   - Skip spaces (but only between parts, not within a number+unit token).
   - Parse a sequence of digits (the number).
   - If no digits found, raise ValueError.
   - Parse the next character as a unit (must be d, h, m, or s).
   - Validate unit order and no repetition.
4. After processing all characters, make sure we ended on a unit (not a number without unit).

Wait, but I need to be careful. If I have "1h 30m", after "h" there's a space, then "30m". So when I'm at the space, I skip it and expect a new number.

Let me think more carefully:

- Strip the string.
- If empty, raise ValueError.
- Use a regex or manual parsing.

Let me try a regex approach:
- Split by one or more spaces to get tokens.
- Each token should match `\d+(d|h|m|s)`.
- But wait, "1h30m" is a single token that doesn't match that pattern as a whole.

So regex on the whole string: I need to match the pattern of alternating number+unit pairs, optionally separated by spaces.

Regex: `^\s*(\d+(d|h|m|s)(\s*\d+(d|h|m|s))*)\s*$`

Actually let me think of a cleaner approach:

Pattern: `^\s*(\d+[dhms](\s*\d+[dhms])*)\s*$`

Then for each matched part, validate order and uniqueness.

Let me use `re.findall` to extract all number+unit pairs, then validate the overall structure.

Wait, but I need to make sure the entire string is consumed properly. Let me use a full match pattern.

```python
import re

def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank string")
    
    # Pattern: optional leading whitespace, then one or more (number + unit) groups separated by optional whitespace, then optional trailing whitespace
    pattern = r'^\s*(\d+[dhms](?:\s*\d+[dhms])*)\s*$'
    m = re.fullmatch(pattern, s)
    if not m:
        raise ValueError(...)
    
    # Now extract all number+unit pairs from m.group(1)
    parts = re.findall(r'(\d+)([dhms])', m.group(1))
    
    # Validate order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    seen = set()
    total = 0
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError("repeated unit")
        if unit_order[unit] <= prev_order:
            raise ValueError("wrong order")
        seen.add(unit)
        prev_order = unit_order[unit]
        total += int(num_str) * multipliers[unit]
    
    return total
```

Wait, let me reconsider. The pattern `\d+[dhms]` - does this handle the case where a number is followed by multiple characters? Like "1hh"? The `[dhms]` matches exactly one character, so "1hh" would match "1h" and then "h" would be unmatched. Actually with `re.findall(r'(\d+)([dhms])', ...)`, "1hh" would match "1h" and then try to match from "h" - but "h" has no preceding digit, so it wouldn't match. The fullmatch would fail because of the trailing "h". Good.

What about "1h3"? The findall would match "1h" but then "3" has no unit. The fullmatch pattern `(\d+[dhms](?:\s*\d+[dhms])*)` - let's see: "1h3" - the first group matches "1h", then it tries `\s*\d+[dhms]` for "3" but "3" doesn't have a unit after it. So the fullmatch fails. Good.

What about "h1"? The pattern requires digits first, so "h1" won't match. Good.

What about "1.5h"? The pattern `\d+[dhms]` won't match "1.5h" because after "1" there's "." which isn't in [dhms]. The fullmatch would fail. Good.

What about "+1h" or "-1h"? The pattern `\d+` doesn't match signs. Good.

What about "1H"? `[dhms]` only has lowercase. Good.

What about "1x"? `[dhms]` doesn't include x. Good.

What about "1h,30m"? The comma isn't matched by the pattern. The fullmatch would fail. Good.

What about "1h\t30m"? `\s*` includes tabs. Hmm, the problem says "separated by one or more spaces". Does `\s` include tabs? The problem says "one or more spaces" - I think this means literal space characters. Let me use `[ ]*` instead of `\s*`.

Actually, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So leading/trailing can be any whitespace, but separators between parts must be spaces specifically. Let me use `\s*` for leading/trailing and `[ ]*` for between parts.

Actually, let me re-read more carefully. "Leading/trailing whitespace is allowed" - this suggests `\s*` for leading/trailing. "separated by one or more spaces" - this suggests space character specifically between parts.

Let me adjust: `^\s*(\d+[dhms](?:[ ]*\d+[dhms])*)\s*$`

Hmm, but what about "1h\t30m"? The tab isn't a space, so `[ ]*` wouldn't match it, and the fullmatch would fail. That seems correct per the spec.

Wait, actually I need to be more careful. What if someone writes "1h  30m" (two spaces)? `[ ]*` handles that (zero or more). But the problem says "one or more spaces" for separation. Actually "written together" means zero spaces. So zero or more spaces is the right pattern between parts.

Let me also handle the edge case: what if the string is "  " (just spaces)? After strip, it's empty, so we raise ValueError. Good.

What about an empty string ""? `not s` catches it. Good.

What about "0d0h0m0s"? That should be valid, giving 0. `\d+` matches "0". Good.

What about "00h"? `\d+` matches "00". `int("00")` is 0. That should be fine.

Let me also think about: does the problem consider "0s" valid? It says "non-negative integer" so yes.

One more thing: what about a string like "1h " (trailing space after strip becomes "1h")? That works.

What about " 1h"? After strip becomes "1h". Good.

I think the solution is solid. Let me also make sure I handle the case where `re.fullmatch` returns None for strings that have valid-looking parts but wrong order. Wait, no - the regex will match the structure, and then I validate order separately. The regex just ensures the format is correct (number+unit pairs separated by spaces).

Actually wait - what about "30m1h"? The regex matches it (it's valid format), but then my order check catches it. Good.

What about "1h1h"? The regex matches (two number+unit pairs), then the `seen` check catches the repetition. Good.

Let me finalize the code.
