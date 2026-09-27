Let me analyze the requirements carefully:

1. Parse a duration string into total seconds
2. Format: `<non-negative integer><unit>` where units are d, h, m, s
3. No space between number and unit
4. Units must appear in order: d, h, m, s
5. Each unit at most once
6. Any subset is allowed
7. Parts can be together ("1h30m") or separated by spaces ("1h 30m")
8. Leading/trailing whitespace allowed
9. No normalization needed
10. ValueError for: empty/blank, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- Strip leading/trailing whitespace
- Split by spaces (one or more) to get parts
- Each part must be `<integer><unit>` where integer is non-negative (digits only, no signs, no decimals)
- Units must be in order d, h, m, s
- Each unit appears at most once

Let me think about what constitutes valid input:
- "2d" → 172800
- "1h30m" → 5400
- "45s" → 45
- "1d4s" → 86404
- "1h 30m" → 5400
- "  2d  " → 172800

Invalid:
- "" or "   " → ValueError
- "2x" → unknown unit
- "1m2h" → wrong order
- "1h1h" → repeated unit
- "1h 2" → missing unit on second part
- "1.5h" → decimals
- "-1h" → signs
- "1H" → uppercase
- "1h 2h" → repeated unit
- "1h,30m" → other separators

Let me write the solution:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Split by one or more spaces
    parts = s.split()
    
    # Validate each part
    total = 0
    prev_unit = -1  # track order: d=0, h=1, m=2, s=3
    
    for part in parts:
        # Each part must match <digits><unit>
        m = re.fullmatch(r'(\d+)([dhms])', part)
        if not m:
            raise ValueError(f"invalid part: {part}")
        
        num = int(m.group(1))
        unit = m.group(2)
        
        unit_index = {'d': 0, 'h': 1, 'm': 2, 's': 3}[unit]
        
        # Check order: must be after previous unit
        if unit_index <= prev_unit:
            raise ValueError(f"wrong order or repeated unit: {unit}")
        
        prev_unit = unit_index
        
        total += num * {'d': 86400, 'h': 3600, 'm': 60, 's': 1}[unit]
    
    return total
```

Wait, let me reconsider. The `re.fullmatch(r'(\d+)([dhms])', part)` handles:
- Digits only (no signs, no decimals)
- Exactly one unit character
- No space between number and unit (since fullmatch)

This also rejects:
- "1.5h" (decimal point)
- "-1h" (negative sign)
- "1H" (uppercase)
- "1" (no unit)
- "h" (no number)
- "1h30m" as a single part? Wait, no - "1h30m" would be split... hmm.

Wait, "1h30m" - if we split by spaces, this is one part "1h30m". But that should be valid! The problem says "Parts may be written together ("1h30m")".

So I need to handle the case where multiple parts are concatenated without spaces. Let me re-think.

Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So "1h30m" is valid and means 1h + 30m. The splitting by spaces would give us ["1h30m"] as one token. I need to parse multiple unit-number pairs from a single token.

Let me reconsider the approach:

1. Strip whitespace
2. Split by spaces (one or more)
3. For each segment, parse all `<digits><unit>` pairs
4. Validate order across all parts

Actually, let me think of it differently. Let me use a regex to find all `<digits><unit>` tokens in the entire string (after stripping), but I need to make sure there are no other characters.

Better approach:
1. Strip the string
2. Check it's not empty
3. Replace all spaces with nothing (since spaces are just separators)
4. Then parse the entire string as a sequence of `<digits><unit>` tokens

Wait, but I need to validate that the only non-digit, non-unit characters are spaces. Let me think...

Actually, let me use a regex approach:
1. Strip
2. Use `re.findall(r'(\d+)([dhms])', s)` to find all matches
3. Check that the concatenation of all matches (plus any spaces) equals the stripped string
4. Validate order

Let me verify:
- "1h30m" → findall gives [("1","h"), ("30","m")] → concatenated "1h30m" matches stripped "1h30m" ✓
- "1h 30m" → findall gives [("1","h"), ("30","m")] → concatenated "1h30m" but stripped is "1h 30m" → doesn't match!

Hmm, I need to account for spaces. Let me think differently.

Approach:
1. Strip
2. Remove all spaces to get a "compact" string
3. Parse the compact string as a sequence of `<digits><unit>` tokens
4. Validate

Let me verify:
- "1h 30m" → compact "1h30m" → tokens: 1h, 30m ✓
- "1h30m" → compact "1h30m" → tokens: 1h, 30m ✓
- "1h  30m" → compact "1h30m" → tokens: 1h, 30m ✓
- "1h,30m" → compact "1h,30m" → would fail regex ✓
- "1h30x" → compact "1h30x" → would fail regex ✓

This works! Let me refine:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Remove all spaces
    compact = s.replace(' ', '')
    
    # Parse all <digits><unit> tokens
    matches = re.findall(r'(\d+)([dhms])', compact)
    
    # Verify the entire compact string is accounted for
    reconstructed = ''.join(f"{n}{u}" for n, u in matches)
    if reconstructed != compact:
        raise ValueError(f"invalid duration string: {s}")
    
    # Validate order
    total = 0
    prev_index = -1
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    for num, unit in matches:
        idx = unit_order[unit]
        if idx <= prev_index:
            raise ValueError(f"wrong order or repeated unit: {unit}")
        prev_index = idx
        total += int(num) * unit_seconds[unit]
    
    return total
```

Wait, what about "1h 30m" - after removing spaces, it's "1h30m". The regex findall on "1h30m" gives [("1","h"), ("30","m")]. Reconstructed is "1h30m" which equals compact. ✓

What about "1h  30m"? After removing spaces: "1h30m". Same as above. ✓

What about "1h30m "? After strip: "1h30m". After removing spaces: "1h30m". ✓

What about "  2d  "? After strip: "2d". After removing spaces: "2d". findall: [("2","d")]. Reconstructed: "2d". ✓

What about "1h,30m"? After strip: "1h,30m". After removing spaces: "1h,30m". findall: [("1","h"), ("30","m")]. Reconstructed: "1h30m" ≠ "1h,30m". ValueError. ✓

What about "1.5h"? After strip: "1.5h". After removing spaces: "1.5h". findall: [("1","h")] (the "5h" part... wait, no. Let me think. `re.findall(r'(\d+)([dhms])', "1.5h")` - this would match "1" followed by... no, "1." - the `.` breaks it. Actually `(\d+)` matches "1", then `([dhms])` needs to match next char which is ".". So no match at position 0. Then at position 2, "5h" matches. So findall gives [("5","h")]. Reconstructed: "5h" ≠ "1.5h". ValueError. ✓

What about "-1h"? After strip: "-1h". findall: [("1","h")]. Reconstructed: "1h" ≠ "-1h". ValueError. ✓

What about "1H"? After strip: "1H". findall: [] (H is not in [dhms]). Reconstructed: "" ≠ "1H". ValueError. ✓

What about "1"? After strip: "1". findall: []. Reconstructed: "" ≠ "1". ValueError. ✓

What about "h"? After strip: "h". findall: []. Reconstructed: "" ≠ "h". ValueError. ✓

What about "1m2h"? After strip: "1m2h". findall: [("1","m"), ("2","h")]. Reconstructed: "1m2h" = compact. Order check: m is index 2, h is index 1. 1 <= 2, so ValueError. ✓

What about "1h1h"? After strip: "1h1h". findall: [("1","h"), ("1","h")]. Reconstructed: "1h1h" = compact. Order check: h is index 1, h is index 1. 1 <= 1, so ValueError. ✓

What about "1d4s"? After strip: "1d4s". findall: [("1","d"), ("4","s")]. Reconstructed: "1d4s" = compact. Order: d=0, s=3. 3 > 0. ✓. Total: 86400 + 4 = 86404. ✓

What about "90m"? After strip: "90m". findall: [("90","m")]. Reconstructed: "90m" = compact. Total: 5400. ✓

Looks good! Let me also consider edge cases:
- What if the string has tabs? The problem says "separated by one or more spaces". I'll only remove spaces (not tabs). If there's a tab, it would remain in compact and fail the reconstruction check. Actually, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces". So only spaces are valid separators. Tabs would be invalid.

Hmm, but should I also handle tabs? The problem says "other separators" should raise ValueError. So tabs are other separators → ValueError. My approach handles this correctly since a tab would remain in `compact` and the reconstruction wouldn't match.

Actually wait - what about `s.replace(' ', '')` - this only removes space characters. If there's a tab, it stays. Good.

Let me also think about: what if there are multiple spaces between parts? "1h   30m" → compact "1h30m" → works fine. ✓

I think this solution is correct. Let me finalize it.
