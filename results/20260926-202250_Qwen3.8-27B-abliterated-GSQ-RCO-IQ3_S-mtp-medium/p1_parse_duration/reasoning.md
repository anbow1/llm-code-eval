Let me analyze the requirements carefully:

1. Parse a duration string into total seconds
2. Format: `<number><unit>` parts where units are d, h, m, s
3. Units must appear in order: d, h, m, s (each at most once)
4. Parts can be together ("1h30m") or separated by one or more spaces ("1h 30m")
5. Leading/trailing whitespace allowed
6. No normalization - "90m" is valid
7. Raises ValueError for various invalid inputs

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by one or more spaces: `s.split()` won't work because "1h 30m" splits into ["1h", "30m"] which is fine. But what about "1h  30m" (multiple spaces)? `split()` handles that.
- But wait - what about "1h 30m" vs "1h30m"? If I split by spaces, "1h30m" becomes one token "1h30m" and "1h 30m" becomes ["1h", "30m"].
- Actually, let me think differently. I should use regex to parse.

Let me use a regex approach:
- The overall pattern: optional spaces, then one or more parts separated by spaces
- Each part: one or more digits followed by a unit character (d, h, m, s)
- Units must be in order d, h, m, s

Let me think about this more carefully with regex:

Pattern for the whole string:
`^\s*((\d+[dhms])(\s+\d+[dhms])*)\s*$`

But I also need to enforce:
- Order: d before h before m before s
- No repeated units
- Each unit at most once

Let me think about using `re.findall` with pattern `(\d+)([dhms])` after validating the structure.

Actually, let me approach it differently:

1. Strip the string
2. If empty, raise ValueError
3. Use a regex to match the entire string: `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$`
4. Extract all (number, unit) pairs
5. Validate the sequence of units is a subsequence of "dhms" with no repeats

Wait, but what about "1h 30m"? If I use the regex `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$`, this would match "1h 30m" as the first part "1h" and then " 30m" as the second.

But what about "1h30m"? The regex `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$` would try to match "1h30m" as a single part. The first part would be "1h" (greedy match of digits is "1" and unit is "h"), but then "30m" is left. Actually with greedy matching, `\d+` would match "1" and `[dhms]` would match "h", giving "1h", then the remaining "30m" needs to match `(\s+\d+[dhms])*` but there's no space before "30m". So "1h30m" would fail!

I need to handle both cases: parts together OR separated by spaces.

Better approach: Split by spaces first, then parse each part. But "1h30m" is one "part" with two duration units.

Let me reconsider. The structure is:
- The string (after stripping) consists of one or more "tokens"
- Tokens are separated by one or more spaces
- Each token is one or more `<number><unit>` concatenated

Wait, re-reading the spec: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")"

So "1h30m" is two parts written together. And "1h 30m" is two parts separated by spaces.

So the overall structure after stripping is:
- One or more parts, where each part is `<digits><unit>`
- Parts are either directly concatenated or separated by one or more spaces

This means: after stripping, the string should match:
`^\d+[dhms](\s*\d+[dhms])*$`

Wait no, that would allow "1h  30m" (multiple spaces) which is fine, but also "1h\t30m"? The spec says "one or more spaces". Let me re-read: "separated by one or more spaces". So only spaces, not tabs.

Actually wait - "Leading/trailing whitespace is allowed." Does "whitespace" here mean just spaces or all whitespace? Let me assume spaces (and maybe other whitespace for leading/trailing). But for separators between parts, it's "one or more spaces".

Let me use: after stripping whitespace (spaces, tabs, newlines?), the internal structure is parts separated by one or more spaces (just spaces? or whitespace?).

I'll be safe and use `\s` for leading/trailing and ` ` (space) for internal separators. Actually, let me re-read: "separated by one or more spaces". I'll use spaces specifically for separators.

Let me use a regex approach:
- Full match: `^\s*(\d+[dhms])([ ]+\d+[dhms])*\s*$`

This handles:
- "1h30m" → "1h" then "30m" (no space between) - wait, this won't work with my regex.

Hmm. Let me reconsider.

"1h30m" - the parts are "1h" and "30m" written together (no space).
"1h 30m" - the parts are "1h" and "30m" separated by a space.

So the overall pattern after stripping is:
- One or more occurrences of `\d+[dhms]`
- Between consecutive occurrences, there's either nothing or one or more spaces

So: `\d+[dhms](\s*\d+[dhms])*` but I need to be careful - if there IS a separator, it must be one or more spaces (not zero spaces, not tabs).

Actually, between two parts, it's either:
- Nothing (concatenated): "1h30m"
- One or more spaces: "1h 30m"

So the pattern is: `\d+[dhms](( | )+\d+[dhms])*\d+[dhms]`... no that's getting complex.

Simpler: `\d+[dhms](\s+\d+[dhms]|(?=\d+[dhms]))*`... no.

Let me think again. The string after stripping should be:
`<part>(<sep><part>)*`
where `<part>` = `\d+[dhms]`
and `<sep>` = one or more spaces, OR empty (for concatenated)

But "empty separator" is tricky. Let me just say:
`<part>( ?<part>)*` where `?` means zero or one... no.

Actually, the simplest regex: `^\s*(\d+[dhms])([ ]*\d+[dhms])*\s*$`

Wait, `[ ]*` means zero or more spaces. That would allow "1h30m" (zero spaces) and "1h 30m" (one space) and "1h   30m" (three spaces). But it would also allow "1h 30m 45s". That's fine.

But does `[ ]*` between parts work? Let's check "1h30m":
- First `\d+[dhms]` matches "1h"
- Then `[ ]*\d+[dhms]` - `[ ]*` matches zero spaces, `\d+[dhms]` matches "30m" ✓

"1h 30m":
- First matches "1h"
- Then `[ ]*` matches " ", `\d+[dhms]` matches "30m" ✓

What about "1h  30m" (two spaces)?
- First matches "1h"
- Then `[ ]*` matches "  ", `\d+[dhms]` matches "30m" ✓

What about "1h\t30m" (tab)?
- First matches "1h"
- Then `[ ]*` matches zero spaces (tab is not a space), `\d+[dhms]` tries to match "\t30m" - fails
- So the full match fails → ValueError ✓ (since spec says "one or more spaces")

Wait, but what about "1h 30m" where there's a space? The `[ ]*` would match the space. But what about "1h30m" where there's no space? `[ ]*` matches empty. Good.

But wait - what about "1h 30m" - could the regex interpret it differently? `\d+[dhms]` is greedy, so `\d+` matches "1" and `[dhms]` matches "h". Then `[ ]*` matches " " and `\d+[dhms]` matches "30m". 

What about "1h30m"? `\d+` matches "1", `[dhms]` matches "h", then `[ ]*` matches "", `\d+` matches "30", `[dhms]` matches "m". 

What about "12h"? `\d+` matches "12", `[dhms]` matches "h". 

What about "1h2"? `\d+` matches "1", `[dhms]` matches "h", then we need `[ ]*\d+[dhms]` - `[ ]*` matches "", `\d+` matches "2", `[dhms]` needs to match... nothing left. Fails. So "1h2" raises ValueError. ✓ (number without unit)

What about "123"? `\d+` matches "123", `[dhms]` needs to match... nothing. Fails. ✓

What about "1h2s"? `\d+` = "1", `[dhms]` = "h", `[ ]*` = "", `\d+` = "2", `[dhms]` = "s". ✓

What about "1hs"? `\d+` = "1", `[dhms]` = "h", then `[ ]*\d+[dhms]` - `[ ]*` = "", `\d+` needs at least one digit but next char is "s". Fails. ✓ (missing number)

What about "1hh"? `\d+` = "1", `[dhms]` = "h", then `[ ]*\d+[dhms]` - `[ ]*` = "", `\d+` needs digit but next is "h". Fails. ✓

OK so the regex `^\s*(\d+[dhms])([ ]*\d+[dhms])*\s*$` seems to work for structure validation.

Now for extraction, I can use `re.findall(r'\d+[dhms]', stripped)` to get all the parts, then parse each into (number, unit).

Wait, but I need to be more careful. What if the string is "1h 30m" - `re.findall(r'\d+[dhms]', "1h 30m")` would give ["1h", "30m"]. Good.

What about "1h30m"? `re.findall(r'\d+[dhms]', "1h30m")` would give ["1h", "30m"]. Good.

Now after extracting parts, I need to validate:
1. Units are in order d, h, m, s
2. No repeated units
3. Each unit at most once

I can check this by assigning each unit a priority (d=0, h=1, m=2, s=3) and verifying the sequence is strictly increasing.

Let me also consider edge cases:
- "0s" → 0 seconds (valid, non-negative integer includes 0)
- "007s" → 7 seconds? The spec says "non-negative integer" - does "007" count? I think leading zeros in numbers should be fine since it's still a valid non-negative integer. Actually, let me re-read: "Anything else raises ValueError: ... missing number, number without unit, decimals, signs, uppercase units, other separators." It doesn't mention leading zeros as invalid. I'll allow them.
- "" → ValueError (empty)
- "   " → ValueError (blank)
- "1d2h3m4s" → 86400 + 7200 + 180 + 4 = 93784
- "2s" → 2
- "1D" → ValueError (uppercase)
- "1 d" → ValueError (space between number and unit within a part)

Wait, "1 d" - with my regex, after stripping: "1 d". `\d+[dhms]` would try to match "1" then need [dhms] but get " ". Fails. ✓

What about "1h 30m 45s"? findall gives ["1h", "30m", "45s"], units are h, m, s → increasing. ✓

What about "1s30m"? Units are s, m → not increasing. ValueError. ✓

What about "1h1h"? Units are h, h → not strictly increasing. ValueError. ✓

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty string")
    
    # Validate overall structure
    if not re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', stripped):
        raise ValueError(f"invalid duration format: {s!r}")
    
    # Extract parts
    parts = re.findall(r'\d+[dhms]', stripped)
    
    # Parse and validate
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    total = 0
    last_order = -1
    for part in parts:
        unit = part[-1]
        number = int(part[:-1])
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"invalid unit order in: {s!r}")
        last_order = order
        total += number * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. `re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', stripped)` - the ` *` means zero or more spaces. But what about the case where there are spaces between the end of one number+unit and the start of the next? Like "1h 30m" - the space is between "h" and "3". In my regex, after matching "1h", the next part of the pattern is `( *\d+[dhms])*`. The ` *` would match the space, then `\d+[dhms]` matches "30m". ✓

But wait, what about "1h  30m" (two spaces)? ` *` matches two spaces. ✓

What about "1h \t30m" (space then tab)? ` *` matches one space, then `\d+[dhms]` tries to match "\t30m" - fails. So the fullmatch fails. ✓ (tab is not a valid separator)

Hmm, but what about " 1h30m " (leading/trailing spaces)? I strip first, so it becomes "1h30m". ✓

What about "1h 30m " (trailing space)? After strip: "1h30m". ✓

What about " 1h 30m" (leading space, internal space)? After strip: "1h 30m". Regex: "1h" matches `\d+[dhms]`, then ` *` matches " ", "30m" matches `\d+[dhms]`. ✓

I think this looks good. Let me also consider:
- "1dh" → "1d" matches, then ` *` matches "", `\d+[dhms]` tries "h" - `\d+` needs at least one digit. Fails. So fullmatch fails. ✓ (missing number for h)

Wait actually: "1dh" - `\d+[dhms]` matches "1d". Then `( *\d+[dhms])*` - ` *` matches "", `\d+` needs a digit but sees "h". Fails. fullmatch fails. ✓

- "1d h" → after strip "1d h". `\d+[dhms]` matches "1d". Then `( *\d+[dhms])*` - ` *` matches " ", `\d+` needs digit but sees "h". Fails. ✓

- "1d  h" → same issue. ✓

- "1 d" → after strip "1 d". `\d+[dhms]` - `\d+` matches "1", `[dhms]` needs d/h/m/s but sees " ". Fails. ✓

- "1.5h" → `\d+[dhms]` - `\d+` matches "1", `[dhms]` sees "." Fails. ✓

- "-1h" → `\d+` sees "-" Fails. ✓

- "+1h" → same. ✓

- "1H" → `[dhms]` sees "H" Fails. ✓

- "1x" → `[dhms]` sees "x" Fails. ✓

Looks solid. Let me also handle the edge case where the string has only spaces (blank) - `s.strip()` would be empty, and we raise ValueError.

One more thing: the spec says "No normalization: '90m' is valid (5400)." So we just compute 90 * 60 = 5400. ✓

Let me finalize the code. I think it's clean and correct.

Actually, wait - I want to double-check one thing. The spec says "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." 

Does this mean that if there IS a separator, it must be spaces (not tabs, etc.)? I think yes. And my regex handles that with ` *` (spaces only).

But what about "1h\t30m"? After strip: "1h\t30m". The regex `\d+[dhms]( *\d+[dhms])*` - "1h" matches, then ` *` matches "" (zero spaces, tab is not a space), then `\d+[dhms]` tries to match "\t30m" - `\d+` sees "\t" and fails. So the group `( *\d+[dhms])*` matches zero times. Then fullmatch requires the entire string to be consumed, but "h\t30m" remains. Wait no - "1h" consumed "1h", and the remaining is "\t30m". The group can't match it. fullmatch fails. ✓

I'm satisfied. Let me write the final solution.
