Let me analyze the requirements:

1. Parse a duration string like "1d4h30m15s" or "1d 4h 30m 15s"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order: d, h, m, s
4. Each unit at most once
5. Any subset is allowed
6. Parts can be together or separated by spaces
7. Leading/trailing whitespace allowed
8. "90m" is valid (no normalization)
9. Raise ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- If empty after strip, raise ValueError
- Split by spaces (one or more spaces between parts)
- Each part must be a non-negative integer followed by a unit character
- Validate the sequence of units is in correct order
- No repeated units

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the whole string could be "1h30m" (no spaces) or "1h 30m" (with spaces). But what about mixed like "1h30m 15s"? Let me re-read...

"Parts may be written together ("1h30m") or separated by one or more spaces"

I think this means parts can be concatenated OR separated by spaces. So "1h30m15s" is valid (all together), "1h 30m 15s" is valid (all separated), and maybe "1h30m 15s" is also valid (mixed).

Actually, re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." I think this means the general format allows both concatenation and space separation. So any mix should work.

Approach:
1. Strip the string
2. If empty, raise ValueError
3. I need to extract all (number, unit) pairs from the string
4. The string should only contain digits, the unit characters (d, h, m, s), and spaces
5. Between parts, there can be zero or more spaces

Let me think of a regex approach:
- The entire string (after stripping) should match: `(number)(unit)(spaces)(number)(unit)...`
- Where number is `\d+` and unit is `[dhms]`

Actually, let me use a regex to find all parts: `\d+[dhms]`

But I also need to validate that there's nothing else in the string (no other characters, no other separators).

Let me think step by step:

1. Strip the string
2. If empty, raise ValueError
3. Use regex to split into parts. The valid characters are: digits, d, h, m, s, and spaces.
4. Actually, let me check: the string should only contain digits, the four unit chars, and spaces.
5. Use regex to find all occurrences of `\d+[dhms]` in the string
6. Also verify that removing all those matches and all spaces leaves nothing

Wait, but what about "1h 30m" - the space is between parts. What about "1h30m" - no space. What about "1h  30m" - multiple spaces?

Let me use this approach:
1. Strip the string
2. If empty, raise ValueError
3. Check that the string only contains valid characters: digits, d, h, m, s, and spaces
4. Find all matches of `\d+[dhms]` using regex
5. Verify that if I replace all matched patterns and all spaces with empty string, nothing remains
6. Validate the sequence of units

Let me refine:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Check for invalid characters
    # Valid: digits, d, h, m, s, space
    for ch in s:
        if ch not in '0123456789dhms ':
            raise ValueError(f"Invalid character: {ch}")
    
    # Find all parts
    parts = re.findall(r'(\d+)([dhms])', s)
    
    # Verify that the string is fully accounted for
    # Remove all parts and spaces, check nothing remains
    reconstructed = ''.join(f"{num}{unit}" for num, unit in parts)
    # Remove spaces from s and check
    if s.replace(' ', '') != reconstructed:
        raise ValueError("Invalid format")
    
    # Validate unit order and uniqueness
    valid_order = ['d', 'h', 'm', 's']
    seen = set()
    last_idx = -1
    total = 0
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    for num, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        seen.add(unit)
        idx = valid_order.index(unit)
        if idx <= last_idx:
            raise ValueError(f"Wrong unit order: {unit}")
        last_idx = idx
        total += int(num) * unit_seconds[unit]
    
    return total
```

Wait, but what about "1h30m" - the regex `(\d+)([dhms])` would match "1h" and "30m". Good.

What about "12h"? The regex would match "12h". Good.

What about just "12"? The regex wouldn't match it (no unit), and when I check `s.replace(' ', '') != reconstructed`, "12" != "" so it would raise. Good.

What about "1h30"? The regex matches "1h" and... wait, "30" has no unit. So parts = [("1", "h")]. reconstructed = "1h". s.replace(' ', '') = "1h30". "1h30" != "1h", so ValueError. Good.

What about "1h 30m"? parts = [("1","h"), ("30","m")]. reconstructed = "1h30m". s.replace(' ', '') = "1h30m". They match. Good.

What about "1h30m15s"? parts = [("1","h"), ("30","m"), ("15","s")]. reconstructed = "1h30m15s". s.replace(' ', '') = "1h30m15s". Match. Good.

What about "  1h  30m  "? After strip: "1h 30m". Works as above.

What about "1h 30m15s"? After strip: "1h 30m15s". parts = [("1","h"), ("30","m"), ("15","s")]. reconstructed = "1h30m15s". s.replace(' ', '') = "1h30m15s". Match. Good.

What about "1h30 m"? After strip: "1h30 m". parts = [("1","h"), ("30","m")]. Wait, does "30 m" match? The regex `(\d+)([dhms])` - "30 m" - the regex would match "30" followed by... no, there's a space between 30 and m. So it wouldn't match "30m". Let me check: "1h30 m" - regex findall would find "1h" (at position 0-1) and then look for more. At position 2, we have "30 m". The regex `\d+[dhms]` would try to match starting at '3': "30" then needs [dhms] but gets ' '. So no match there. Then at position 4, 'm' - not a digit start. So parts = [("1","h")]. reconstructed = "1h". s.replace(' ','') = "1h30m". "1h30m" != "1h". ValueError. Good.

What about "0s"? parts = [("0","s")]. total = 0. Valid.

What about "0"? No unit. parts = []. reconstructed = "". s.replace(' ','') = "0". "0" != "". ValueError. Good.

What about uppercase "1H"? The character check: 'H' is not in '0123456789dhms '. So ValueError. Good.

What about "-1h"? '-' is not in valid chars. ValueError. Good.

What about "1.5h"? '.' is not in valid chars. ValueError. Good.

What about "1h,30m"? ',' is not in valid chars. ValueError. Good.

What about "1d 2h 3m 4s"? parts = [("1","d"),("2","h"),("3","m"),("4","s")]. Order d,h,m,s - correct. total = 86400+7200+180+4 = 93784. Good.

What about "2h 1d"? parts = [("2","h"),("1","d")]. Order: h then d. idx of h = 1, idx of d = 0. 0 <= 1, so ValueError. Good.

What about "1h1h"? parts = [("1","h"),("1","h")]. 'h' in seen on second iteration. ValueError. Good.

I think this solution handles all the cases. Let me also consider: what if there are tabs or other whitespace? The problem says "one or more spaces" and "Leading/trailing whitespace is allowed." I'll assume only spaces are valid separators. Tabs would fail the character check.

Actually wait - "Leading/trailing whitespace is allowed" - does this mean just spaces or any whitespace? The problem says "separated by one or more spaces" for internal separation. For leading/trailing, I'll use strip() which handles all whitespace, but then my character check would reject tabs inside. Let me re-read...

"Leading/trailing whitespace is allowed" - I'll interpret this as the string.strip() handles it, and internal separation is by spaces only. My character check already handles this correctly since I only allow ' ' (space) as whitespace character in the middle.

Actually, I should be more careful. Let me use `s.strip()` which removes all leading/trailing whitespace (including tabs, newlines). Then for the internal content, I only allow spaces as separators.

Hmm, but what if the input is "1h\t30m"? The tab is between parts. After strip, it's still "1h\t30m". My character check would reject '\t'. I think that's correct per the spec - "other separators" should raise ValueError.

Let me finalize my solution.
