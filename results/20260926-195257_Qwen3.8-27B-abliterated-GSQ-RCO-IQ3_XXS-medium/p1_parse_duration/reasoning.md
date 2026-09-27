The user wants a Python function `parse_duration(s: str) -> int` that parses duration strings like "1h30m" or "1d 4s" into total seconds.

Let me think through the rules carefully:

1. A part is `<non-negative integer><unit>` with NO space between number and unit.
2. Units: d (86400 s), h (3600 s), m (60 s), s (1 s). Lowercase only.
3. Units must appear in order: d, h, m, s. Each unit at most once. Any subset allowed.
4. Parts may be together or separated by one or more spaces.
5. Leading/trailing whitespace is allowed.
6. No normalization: "90m" is valid.
7. ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Let me think about the parsing approach:

First, strip leading/trailing whitespace. If empty after stripping, raise ValueError.

Then, I need to handle the fact that parts can be separated by spaces or not. So "1h30m" and "1h 30m" are both valid.

Approach:
1. Strip the string. If empty, raise ValueError.
2. I need to split into parts. Since spaces separate parts, I can split by spaces. But "1h30m" has no spaces, so I need to handle that too.

Wait, let me reconsider. The parts are `<number><unit>`. If they're written together like "1h30m", I need to parse them as "1h" and "30m". If separated by spaces, "1h 30m" is "1h" and "30m".

So the approach could be:
1. Strip the string.
2. Replace spaces with nothing? No, that would make "1h 30m" into "1h30m" which is the same. But wait, what about "1h  30m" (multiple spaces)? That should also be valid. And "1h 30m" vs "1h30m" - both should work.

Actually, let me think differently. I can use a regex approach.

Let me use regex to match each part: a sequence of digits followed by a unit character.

But I need to handle the spacing between parts. Let me think...

Option 1: Use regex to find all parts (digits followed by unit char), and also verify there's nothing else.

Let me use a regex approach:
- The entire string (after stripping) should match a pattern of:
  - One or more parts, separated by zero or more spaces
  - Each part is: one or more digits followed by one of d, h, m, s

Pattern: `^\s*(\d+[dhms])(\s+\d+[dhms])*...` - this gets complex.

Better approach: 
1. Strip the string.
2. If empty, raise ValueError.
3. Use regex to find all "parts" in the string, where a part is `\d+[dhms]`.
4. Check that the entire string (after stripping) consists only of parts separated by spaces.

Let me think of a cleaner regex for the whole string:
`^(\d+[dhms])(\s+\d+[dhms])*...` - no, this doesn't work for multiple spaces or no spaces.

Actually: `^(\d+[dhms])(\s*\d+[dhms])*...` - no, `\s*` would allow zero spaces, but also multiple. Wait, but what about "1h 30m" - that's "1h", space, "30m". And "1h30m" is "1h", "30m" with no space.

So the pattern for the whole stripped string would be:
`^\d+[dhms](\s*\d+[dhms])*$` - wait, but `\s*` between parts allows zero or more spaces. That handles both cases.

But wait, I need to make sure there are no other characters. Let me verify:
- "1h30m" → matches `^\d+[dhms](\s*\d+[dhms])*$` → "1h" then "30m" ✓
- "1h 30m" → "1h" then " 30m" → \s* matches " " then "30m" ✓
- "1h  30m" → \s* matches "  " then "30m" ✓
- "1h 30m 45s" → "1h", " 30m", " 45s" ✓

But wait, what about "1h 30m5s"? Is "30m5s" one part or two? By the rules, "30m5s" would be two parts "30m" and "5s" written together. So it should be valid if the order is correct (m before s). Let me check: the regex would match "1h", " 30m", "5s" - yes that works.

What about "1h30m45s"? → "1h", "30m", "45s" ✓

What about "1h 30m 45s"? → "1h", " 30m", " 45s" ✓

What about "1h  30m  45s"? → "1h", "  30m", "  45s" ✓

Now I need to validate:
1. The regex fully matches the stripped string.
2. The units are in order d, h, m, s.
3. No repeated unit.
4. All numbers are non-negative integers (regex handles this with \d+).

Let me also think about edge cases:
- "0" → just a number without unit → ValueError
- "0s" → valid, 0 seconds
- "00s" → valid? "00" is a non-negative integer. I think yes.
- "007s" → valid, 7 seconds
- "1h" → valid, 3600 seconds
- "" → ValueError
- "   " → ValueError (blank)
- "1H" → ValueError (uppercase)
- "1 x" → ValueError (unknown unit)
- "1h1h" → ValueError (repeated unit)
- "1m1h" → ValueError (wrong order)
- "1.h" → ValueError (decimal)
- "-1h" → ValueError (sign)
- "1h -" → ValueError

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Match the entire string: one or more parts (digits + unit), separated by zero or more spaces
    pattern = r'^(\d+[dhms])(\s*\d+[dhms])*$'
    # Actually, I need to extract the parts. Let me use findall or a different approach.
    
    # Better: split by spaces to get potential parts, but "1h30m" has no spaces...
    # Actually, let me use a regex to find all parts and verify the whole string is accounted for.
    
    # Let me use a different approach:
    # 1. Replace all spaces between parts (or no spaces) - actually, let me just find all "parts" and check they cover the entire string.
    
    # Find all parts: \d+[dhms]
    # But I also need to ensure the entire string is parts + spaces
    
    # Let me use: re.fullmatch with a pattern
    # Pattern: one or more parts separated by optional spaces
    # ^\d+[dhms](\s+\d+[dhms])*... no wait, zero spaces too
    
    # Actually: ^\d+[dhms](\s*\d+[dhms])*$
    # But this requires at least one part. Let me verify with "1h30m":
    # First part: "1h", then (\s*\d+[dhms])* matches "30m" → yes
    
    # Let me extract parts using finditer:
    parts = []
    # I'll use the fullmatch to verify structure, then extract
    
    # Actually, simplest: use re.findall with a pattern that captures parts,
    # and also verify no extra characters.
    
    # Let me try: split the stripped string into tokens
    # Since parts are \d+[dhms] and separated by spaces (zero or more):
    
    # I'll use re.fullmatch on the stripped string with the pattern
    # and capture all parts
    
    # Pattern to capture all parts:
    # ^(\d+[dhms])(\s*\d+[dhms])*$  - but I need to capture each part
    
    # Let me use a different regex:
    # Match: one or more occurrences of (\d+[dhms]) separated by optional whitespace
    # ^(\d+[dhms])(\s*(\d+[dhms]))*$  - but this is messy with groups
    
    # Simpler: I'll validate with fullmatch, then extract with findall
    full_pattern = r'^\d+[dhms](\s*\d+[dhms])*$'
    if not re.fullmatch(full_pattern, s):
        raise ValueError("invalid duration format")
    
    # Now extract all parts
    parts = re.findall(r'\d+[dhms]', s)
    
    # Validate order and no repeats
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    last_order = -1
    total = 0
    for part in parts:
        unit = part[-1]
        num = int(part[:-1])
        if unit_order[unit] <= last_order:
            raise ValueError("wrong order or repeated unit")
        last_order = unit_order[unit]
        total += num * unit_seconds[unit]
    
    return total
```

Wait, I need to double-check the regex. Let me think about potential issues:

- "1h30m" → fullmatch of `^\d+[dhms](\s*\d+[dhms])*$`:
  - First: "1h" matches `\d+[dhms]`
  - Then `(\s*\d+[dhms])*`: "30m" → `\s*` matches empty, `\d+` matches "30", `[dhms]` matches "m" ✓
  - Total match ✓

- "1h 30m" → 
  - First: "1h"
  - Then: `\s*` matches " ", "30m" ✓

- "1h" → 
  - First: "1h"
  - Then: `(\s*\d+[dhms])*` matches zero times ✓

- "1h30" → 
  - First: "1h"
  - Then: `\s*` matches empty, `\d+` matches "30", `[dhms]`... wait, there's nothing left after "30". So it won't match. ✓ (raises ValueError)

- "1h30m45s" →
  - First: "1h"
  - Then: "30m" and "45s" ✓

- "1h 30m 45s" →
  - First: "1h"
  - Then: " 30m" and " 45s" ✓

- "1h  30m  45s" →
  - First: "1h"
  - Then: "  30m" and "  45s" ✓

- "1h30m45s" → 
  - First: "1h"
  - Then: "30m", "45s" ✓

- "1h30m45x" →
  - First: "1h"
  - Then: "30m"
  - Then: "45x" → `\d+` matches "45", `[dhms]` needs to match "x" → fails
  - So fullmatch fails → ValueError ✓

- "1h 30 45s" →
  - First: "1h"
  - Then: " 30" → `\s*` matches " ", `\d+` matches "30", `[dhms]`... next char is " " which is not in [dhms]. Fails.
  - So fullmatch fails → ValueError ✓

Wait, actually let me re-examine. In "1h 30 45s":
- After "1h", we have " 30 45s"
- `\s*` matches " ", then `\d+` tries to match "30", then `[dhms]` needs to match next char which is " " → fails
- So it backtracks... actually `\d+` could match "3" and then `[dhms]` would need "0" which is not in [dhms]. Or `\d+` matches "30" and `[dhms]` needs " " which fails.
- So the whole match fails → ValueError ✓

What about "1h30m 45s"?
- First: "1h"
- Then: "30m"
- Then: " 45s" → `\s*` matches " ", "45s" ✓
- Full match ✓

What about edge cases with numbers:
- "0s" → valid, 0 seconds
- "00s" → valid, 0 seconds (int("00") = 0)
- "007s" → valid, 7 seconds

What about "1h0m"?
- "1h", "0m" → valid, 3600 seconds

I think the regex approach works. Let me also consider:
- What if there's a tab instead of space? "1h\t30m" → `\s` matches tab, so it would be valid. The rules say "one or more spaces" - does that mean only literal space characters, or any whitespace? The rules say "separated by one or more spaces" and "Leading/trailing whitespace is allowed." I'll interpret "spaces" as any whitespace character (since the rule says "whitespace" for leading/trailing). Actually, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces". I think "spaces" here means space characters specifically, but `\s` would also match tabs, newlines, etc. Let me be strict and use ` ` (literal space) instead of `\s`.

Hmm, but "Leading/trailing whitespace is allowed" - this suggests any whitespace. Let me use `\s` for the separators and `strip()` for leading/trailing. Actually, I'll use `\s` to be safe - it handles spaces, tabs, etc.

Wait, but the rule says "separated by one or more spaces". If I use `\s*`, that allows zero spaces too, which is the "written together" case. And it allows multiple spaces. I think that's fine.

Actually, re-reading the rules: "separated by one or more spaces" - this means between parts there should be either nothing (written together) or one or more spaces. So zero or more spaces. `\s*` handles this.

But wait, should I be more strict? Like, should "1h\t30m" (tab separator) be valid or not? The rules say "spaces" not "whitespace". But for leading/trailing it says "whitespace". I'll go with `\s` (any whitespace) for the separators to be lenient, since the rules mention whitespace for leading/trailing.

Actually, I'll stick with `\s` to handle all whitespace characters. The rules don't explicitly exclude tabs.

Let me also think about: what if the number is "0"? Is "0h" valid? Yes, 0 hours = 0 seconds. What about "00h"? int("00") = 0, valid.

What about very large numbers? "999999999999999999s" → valid, just a big int.

I think my solution is correct. Let me finalize it.

One more thought: the rule says "No normalization: "90m" is valid (5400)." This means I should NOT reject "90m" even though it could be "1h30m". Good, my solution handles this.

Also: "missing number" - like "h" or "d" alone. My regex `\d+[dhms]` requires at least one digit, so "h" won't match → ValueError ✓

"number without unit" - like "123" or "123 ". My regex requires a unit char after digits, so "123" won't fullmatch → ValueError ✓

"decimals" - like "1.5h". My regex `\d+[dhms]` - after "1", the next char is "." which is not in [dhms], so it fails. But wait, what about "1.5h"? The fullmatch `^\d+[dhms](\s*\d+[dhms])*$` on "1.5h":
- `\d+` matches "1", `[dhms]` needs to match "." → fails.
- So fullmatch fails → ValueError ✓

"signs" - like "-1h" or "+1h". 
- "-1h": `\d+` can't match "-", fullmatch fails → ValueError ✓
- "+1h": same → ValueError ✓

"uppercase units" - like "1H" or "1M".
- "1H": `\d+` matches "1", `[dhms]` needs to match "H" → fails → ValueError ✓

"other separators" - like "1h,30m" or "1h;30m".
- "1h,30m": After "1h", `\s*` matches empty, `\d+` needs to match "," → fails. Or `\s*` matches empty, then we're at the end of the first group, and the second group needs `\d+[dhms]` starting at "," → fails. So fullmatch fails → ValueError ✓

I'm satisfied the solution is correct. Let me write the final version.
