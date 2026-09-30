Let me carefully analyze the requirements:

1. A duration string is composed of parts like `<integer><unit>` where unit is d, h, m, s.
2. Units must appear in order d, h, m, s. Each unit at most once.
3. Parts can be together ("1h30m") or separated by one or more spaces.
4. Leading/trailing whitespace is allowed.
5. No normalization: "90m" is valid.
6. Anything else raises ValueError.

Let me think about the parsing approach:

First, strip leading/trailing whitespace. If empty after stripping, raise ValueError.

Then I need to parse the string. The challenge is that parts can be together or separated by spaces. So I need to split by whitespace first, then each segment (which might contain multiple parts) needs to be parsed.

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the structure is:
- The string may have leading/trailing whitespace (which is stripped).
- Parts can be adjacent (no space) or separated by one or more spaces.
- After splitting by whitespace, each token is a sequence of parts like "1h30m".

Actually, let me think more carefully. "1h 30m" has a space between parts. "1h30m" has no space. What about "1h  30m"? That should also be valid since "one or more spaces".

Approach:
1. Strip the string. If empty, ValueError.
2. Split by whitespace to get tokens.
3. Each token is a sequence of `<number><unit>` parts concatenated together.
4. Parse each token into its parts.
5. Validate: units in order d, h, m, s; each unit at most once.

For parsing a token like "1h30m":
- I need to extract sequences of digits followed by a single unit letter.
- Use a regex like `(\d+)([dhms])` to find all parts in a token.
- But I need to make sure the entire token is consumed by these parts. If there's anything left over, it's invalid.

Let me think about edge cases:
- "1d4s" → valid (d then s, skip h and m)
- "90m" → valid, 90*60 = 5400
- "1h 30m" → valid, 3600 + 1800 = 5400
- "1h30m" → valid
- "30m1h" → invalid (wrong order)
- "1h1h" → invalid (repeated unit)
- "1h30" → invalid (missing unit)
- "30" → invalid (number without unit)
- "1.5h" → invalid (decimals)
- "-1h" → invalid (signs)
- "1H" → invalid (uppercase)
- "" → invalid
- "   " → invalid
- "1d,2h" → invalid (other separators)

Let me write the regex approach:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = ['d', 'h', 'm', 's']
    
    # Split by one or more whitespace
    tokens = re.split(r'\s+', s)
    
    # Parse each token into parts
    parts = []
    for token in tokens:
        # Each token must be a sequence of <digits><unit>
        matches = re.findall(r'(\d+)([dhms])', token)
        # Verify the token is fully consumed
        reconstructed = ''.join(m + u for m, u in matches)
        if reconstructed != token:
            raise ValueError(f"invalid token: {token}")
        if not matches:
            raise ValueError(f"invalid token: {token}")
        for num_str, unit in matches:
            parts.append((int(num_str), unit))
    
    # Validate: units in order, each at most once
    seen_units = set()
    last_order = -1
    total = 0
    for num, unit in parts:
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        if unit not in unit_order:
            raise ValueError(f"unknown unit: {unit}")
        order = unit_order.index(unit)
        if order <= last_order:
            raise ValueError(f"wrong order")
        seen_units.add(unit)
        last_order = order
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to be careful with the regex. The `(\d+)([dhms])` pattern: what about "12h30m"? It should match "12h" and "30m". Let me check: findall on "12h30m" with pattern `(\d+)([dhms])` would give [("12", "h"), ("30", "m")]. Then reconstructed = "12h30m" which equals the token. Good.

What about "1h30"? findall gives [("1", "h")]. reconstructed = "1h" != "1h30". So it raises ValueError. Good.

What about "30"? findall gives []. reconstructed = "" != "30". ValueError. Good.

What about "1.5h"? findall gives [("1", "h")] (the ".5" doesn't match). Wait, actually `\d+` would match "1", then `[dhms]` would need to match the next char which is ".". So it wouldn't match "1" followed by ".". Actually, findall would try to match at position 0: `\d+` matches "1", then `[dhms]` needs to match "." which fails. Then try position 1: "." doesn't match `\d+`. Position 2: "5" matches `\d+`, then "h" matches `[dhms]`. So we get [("5", "h")]. reconstructed = "5h" != "1.5h". ValueError. Good.

What about "-1h"? findall gives [("1", "h")]. reconstructed = "1h" != "-1h". ValueError. Good.

What about "1H"? findall with `[dhms]` won't match "H". So matches is empty. reconstructed = "" != "1H". ValueError. Good.

What about "1d,2h"? Splitting by whitespace gives one token "1d,2h". findall gives [("1", "d")]. reconstructed = "1d" != "1d,2h". ValueError. Good.

What about "1h  30m" (multiple spaces)? re.split(r'\s+', s) gives ["1h", "30m"]. Both parse fine. Good.

What about leading/trailing spaces: "  1h30m  "? strip gives "1h30m". Good.

What about "   " (only whitespace)? strip gives "". Then `if not s` catches it. Good.

What about ""? strip gives "". ValueError. Good.

Hmm, one more thing: what about "0h"? The spec says "non-negative integer", so 0 is valid. `int("0")` = 0. That's fine.

What about "00h"? `\d+` matches "00", int("00") = 0. That seems fine.

What about the case where there are multiple spaces between parts but also parts are together: "1h  30m45s"? Split gives ["1h", "30m45s"]. "30m45s" → [("30","m"),("45","s")]. reconstructed = "30m45s" == token. Good.

What about "1h30 m"? This would be weird. Split gives ["1h30", "m"]. "1h30" → [("1","h")], reconstructed "1h" != "1h30" → ValueError. Good, because "30" has no unit.

I think this solution is solid. Let me also consider: what if the string contains tabs or newlines? The spec says "one or more spaces" but `\s+` handles all whitespace. I think that's fine.

Let me also consider: what about a token that's entirely digits like "123"? findall gives []. ValueError. Good.

What about "12h30m45s1d"? findall gives [("12","h"),("30","m"),("45","s"),("1","d")]. Order check: h(1), m(2), s(3), d(0). d's order (0) < s's order (3), so last_order check fails. ValueError. Good.

I'm satisfied with the solution. Let me write the final version.
