Let me design a `parse_duration` function that parses duration strings like "1d2h30m45s" into total seconds.

Rules:
1. Parts are `<non-negative integer><unit>` with no space between number and unit
2. Units: d (86400s), h (3600s), m (60s), s (1s) - lowercase only
3. Units must appear in order d, h, m, s. Each at most once.
4. Parts can be together or separated by spaces
5. No normalization
6. Strict validation - anything else raises ValueError

Approach:
- Strip the string
- If empty, raise ValueError
- Tokenize: split by whitespace to get tokens, then each token must be a valid `<digits><unit>` part
- Actually, let me think more carefully. "1h30m" is one token with two parts together. So I can't just split by spaces and expect each space-separated token to be a single unit.

Better approach:
- Strip whitespace
- If empty, raise ValueError
- Use regex to find all `<digits><unit>` patterns, but I need to ensure the ENTIRE string is consumed by valid parts.

Let me think about this differently:
- After stripping, the string should consist of one or more parts, each being `<digits><unit>`, possibly separated by whitespace.
- I need to validate that the entire string matches this pattern exactly.

Strategy:
1. Strip leading/trailing whitespace
2. If empty, raise ValueError
3. Use a regex to match the full pattern: one or more `(digits)(unit)` groups separated by optional whitespace
4. Extract all parts, validate order, no repeats, etc.

The regex pattern would be something like:
`^(\d+[dhms])(\s*\d+[dhms])*$`

Wait, but I need to be more careful. Let me use `re.fullmatch` with a pattern that captures each part.

Actually, let me use a more systematic approach:
1. Strip the string
2. Use regex to find all occurrences of `\d+[dhms]` 
3. Verify that after removing all whitespace and these matches, nothing remains (i.e., the string is fully composed of these parts separated by optional whitespace)

Or better: use a regex to match the entire string and extract parts:
- Pattern: `(\d+)([dhms])` - but I need to ensure the full string is covered.

Let me use `re.fullmatch` on the pattern `(\d+[dhms](?:\s*\d+[dhms])*)` and then extract individual parts.

Actually, a cleaner approach:
1. Strip the string
2. Remove all whitespace (or split by whitespace and join)
3. Then match the remaining string against `(\d+[dhms])+` with fullmatch

Wait, but "1h 30m" - if I remove all whitespace, I get "1h30m" which is valid. And "1h30m" is also valid. So I can:
1. Strip
2. If empty, raise ValueError
3. Remove all whitespace (replace spaces with nothing)... 

Wait, the spec says "separated by one or more spaces". What about tabs? The spec says "one or more spaces" - I'll assume only spaces. But "Leading/trailing whitespace is allowed" - this might include tabs? Let me be safe and use `\s*` for separators.

Actually, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

I think "spaces" here means whitespace. Let me use `\s` to be safe.

So my approach:
1. Strip the string (removes leading/trailing whitespace)
2. If empty after stripping, raise ValueError
3. Try to fully match against a pattern that is one or more `\d+[dhms]` separated by optional whitespace
4. Extract all parts
5. Validate order and no repeats

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Full match: one or more digit+unit separated by optional whitespace
    full_pattern = r'(\d+[dhms](?:\s+\d+[dhms])*)'
    if not re.fullmatch(full_pattern, s):
        raise ValueError("invalid format")
    
    # Extract all parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    # Validate order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    last_order = -1
    total = 0
    
    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if unit_order[unit] <= last_order:
            raise ValueError(f"wrong order or repeated unit")
        seen.add(unit)
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, let me reconsider the fullmatch pattern. If parts can be written together without spaces like "1h30m", then `\s+` between them would be `\s*`. Let me fix:

`r'(\d+[dhms](?:\s*\d+[dhms])*)'`

This allows zero or more whitespace between parts.

Let me verify with examples:
- "1h30m" → matches, parts = [("1","h"), ("30","m")] → valid
- "1h 30m" → matches, parts = [("1","h"), ("30","m")] → valid
- "2d" → matches, parts = [("2","d")] → valid
- "45s" → matches → valid
- "1d4s" → matches → valid (d before s, correct order)
- "" → raises ValueError
- " " → strip → "" → raises ValueError
- "1h30M" → uppercase M doesn't match [dhms] → fullmatch fails → raises ValueError
- "1h1h" → matches regex, but repeated unit check fails → raises ValueError
- "30m1h" → matches regex, but order check fails (m before h) → raises ValueError
- "90m" → matches → valid (no normalization needed)
- "1.5h" → "1.5h" - the regex expects `\d+` so "1" matches, then ".5h" doesn't match `[dhms]`... actually let me think. `\d+` would match "1", then `[dhms]` would need to match "." which fails. So fullmatch would fail. Good.
- "+1h" → "+" doesn't match `\d+` at start → fullmatch fails. Good.
- "h" → no digits → fullmatch fails. Good.
- "1h " → after strip it's "1h" → matches. Good.
- " 1h" → after strip it's "1h" → matches. Good.

What about "1h  " with trailing spaces? After strip it's "1h". Good.

What about tabs as separators? "1h\t30m" → after strip, it's "1h\t30m" → the `\s*` in the pattern matches tabs. Is that correct per the spec? The spec says "one or more spaces" but also "Leading/trailing whitespace". I'll go with `\s*` to be permissive since the spec's use of "spaces" might be informal.

Hmm, but the spec says "other separators" should raise ValueError. So maybe tabs should be rejected? Let me re-read: "Anything else raises ValueError: empty or blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators."

"Other separators" - this might mean things like commas, semicolons, etc. But whitespace (spaces, tabs) between parts is explicitly allowed. I'll stick with `\s*` for separators since the spec explicitly allows spaces and the word "separators" in the error list likely refers to non-whitespace characters.

Actually wait, let me reconsider. "Parts may be written together or separated by one or more spaces". This says "one or more spaces" specifically. And "Leading/trailing whitespace is allowed". So maybe only literal space characters are valid separators, but leading/trailing can be any whitespace?

I think to be safe, I'll use `\s*` since:
1. Leading/trailing whitespace is explicitly allowed (any whitespace)
2. "One or more spaces" between parts - I'll interpret this as whitespace characters
3. "Other separators" in the error list means things like commas, pipes, etc.

Let me finalize my solution. I think it's correct. Let me also consider edge cases:
- "0s" → valid, returns 0
- "0d0h0m0s" → valid, returns 0
- "0" → no unit → fullmatch fails → raises ValueError. Good.

One more thing: what about "1h30m " (trailing space after strip)? After strip it's "1h30m". Good.

What about multiple spaces between parts: "1h   30m"? The `\s*` handles that. Good.

I think my solution is correct. Let me write the final version.
