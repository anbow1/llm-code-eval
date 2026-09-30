Let me analyze the requirements:

1. Parse a duration string into total seconds
2. Format: `<number><unit>` parts, where units are d, h, m, s
3. Units must appear in order: d, h, m, s (each at most once)
4. Parts can be together or separated by spaces
5. No normalization needed
6. Various invalid cases should raise ValueError

Let me think about the approach:

1. Strip leading/trailing whitespace
2. If empty after strip, raise ValueError
3. Split by spaces (one or more) to get parts
4. For each part, validate it matches the pattern `<non-negative integer><unit>` where unit is one of d, h, m, s
5. Check that units are in correct order and not repeated
6. Calculate total seconds

Let me think about validation:
- Each part must match: `^\d+[dhms]$`
- Units must be in order d < h < m < s (where d=0, h=1, m=2, s=3)
- No repeated units
- No decimals, no signs, no uppercase, no other separators

Let me write this:

```python
def parse_duration(s: str) -> int:
    import re
    
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Split by one or more spaces
    parts = s.split()
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    last_order = -1
    total = 0
    
    for part in parts:
        # Each part must be a non-negative integer followed by a single unit character
        if len(part) < 2:
            raise ValueError(f"Invalid part: {part}")
        
        unit = part[-1]
        num_str = part[:-1]
        
        if unit not in unit_order:
            raise ValueError(f"Unknown unit: {unit}")
        
        if not num_str.isdigit():
            raise ValueError(f"Invalid number: {num_str}")
        
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong order or repeated unit: {unit}")
        last_order = order
        
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to be careful. `isdigit()` on an empty string returns False, so that's fine. But what about a part like "5"? That has length 1, so it would be caught by the `len(part) < 2` check. Good.

What about "005s"? The rules say "non-negative integer" - does "005" count? I think it should be valid since it's a non-negative integer representation. The rules don't say "no leading zeros". Let me re-read... "A part is <non-negative integer><unit>". I'll allow leading zeros since "005" is still a non-negative integer.

Actually wait, let me reconsider. The problem says "missing number" should raise ValueError. What about "s" (just a unit with no number)? That would have `num_str = ""` and `"".isdigit()` is False, so it would raise ValueError. Good.

What about a part like "123" (number without unit)? The last character "3" is not in unit_order, so it would raise ValueError. Good.

What about "1.5s"? The `num_str` would be "1.5" and `"1.5".isdigit()` is False. Good.

What about "-5s"? `num_str` would be "-5" and `"-5".isdigit()` is False. Good.

What about "1D"? `unit = 'D'` which is not in unit_order. Good.

What about tabs or other whitespace? The problem says "separated by one or more spaces". So tabs should not be valid separators. Let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces". And "other separators" should raise ValueError.

So I should only split on spaces, not general whitespace. Let me use `re.split(r' +', s)` instead of `s.split()`.

Wait, but `s.strip()` removes all whitespace including tabs. Let me reconsider.

The problem says "Leading/trailing whitespace is allowed." So I strip leading/trailing whitespace. But for internal separators, only spaces are allowed.

Actually, let me re-read: "separated by one or more spaces". So I should split on spaces specifically. If there's a tab between parts, that should be invalid.

Let me use:
```python
s = s.strip()
parts = s.split(' ')
# Filter out empty strings from multiple spaces
```

Wait, if I split on single space, "1h  30m" becomes ["1h", "", "30m"]. I need to handle multiple spaces. Let me use `re.split(r' +', s)` which splits on one or more spaces.

But wait, what if there's a tab? Like "1h\t30m"? After strip, it's still "1h\t30m". `re.split(r' +', s)` would give ["1h\t30m"] which is one part. Then "1h\t30m" - the last char is 'm', num_str is "1h\t30" which is not a digit. So it would raise ValueError. Good.

Actually wait, what about "1h \t 30m"? After strip it's "1h \t 30m". `re.split(r' +', s)` gives ["1h", "\t", "30m"]. Then "\t" as a part: len is 1, so it raises ValueError. Good.

Hmm, but what about "1h\t30m"? After strip: "1h\t30m". `re.split(r' +', s)` gives ["1h\t30m"]. Then parsing "1h\t30m": unit = 'm', num_str = "1h\t30", not a digit. ValueError. Good.

Let me finalize:

```python
def parse_duration(s: str) -> int:
    import re
    
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    parts = re.split(r' +', s)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    last_order = -1
    total = 0
    
    for part in parts:
        if len(part) < 2:
            raise ValueError(f"Invalid part: {part}")
        
        unit = part[-1]
        num_str = part[:-1]
        
        if unit not in unit_order:
            raise ValueError(f"Unknown unit: {unit}")
        
        if not num_str.isdigit():
            raise ValueError(f"Invalid number: {num_str}")
        
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong order or repeated unit: {unit}")
        last_order = order
        
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

This looks good. Let me trace through some examples:
- "2d" → parts=["2d"], unit='d', num="2", total=172800 ✓
- "1h30m" → parts=["1h30m"], unit='m', num="1h30" → not digit → ValueError!

Wait, that's wrong! "1h30m" should be valid. The issue is that "1h30m" is a single part with no spaces, but it contains two units.

I need to rethink. The parts are not separated by spaces necessarily - they can be written together. So I need to parse the string differently.

Let me use a regex to find all `<number><unit>` tokens in the string, and verify that the entire string (after stripping) is composed of these tokens possibly separated by spaces.

Better approach: use a regex to match the entire string.

Pattern: `^\s*(\d+[dhms])(\s+\d+[dhms])*\s*$`

Then extract all the tokens and validate their order.

Let me use `re.findall(r'\d+[dhms]', s)` and also verify that the string only contains digits, the unit characters, and spaces.

Actually, a cleaner approach:

1. Strip the string
2. Use regex to find all matches of `\d+[dhms]` 
3. Verify that the concatenation of matches + spaces accounts for the entire string
4. Validate order

Or even simpler: use a single regex to match the whole thing:

```python
pattern = r'^\s*(\d+[dhms])(?:\s+(\d+[dhms]))*\s*$'
```

Hmm, this is getting complex. Let me think differently.

I'll use `re.finditer` to find all `\d+[dhms]` tokens, then verify that between tokens there are only spaces, and the string starts and ends correctly.

Actually, the simplest approach:

1. Strip the string
2. Replace all spaces with nothing? No, that doesn't work because I need to validate spaces are the only separators.

Let me try: 
1. Strip
2. Check that the string only contains digits, d, h, m, s, and spaces
3. Use regex to find all `\d+[dhms]` tokens
4. Verify that removing all tokens and spaces from the string gives empty (i.e., the string is fully accounted for)
5. Validate order of units

```python
def parse_duration(s: str) -> int:
    import re
    
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Check only valid characters
    if not re.fullmatch(r'[0-9dhms ]+', s):
        raise ValueError("Invalid characters")
    
    # Find all tokens
    tokens = re.findall(r'\d+[dhms]', s)
    
    # Verify the string is fully composed of tokens and spaces
    # Remove all tokens and spaces, should be empty
    reconstructed = re.sub(r'\d+[dhms]', '', s)
    if reconstructed.replace(' ', '') != '':
        raise ValueError("Invalid format")
    
    # Also check that spaces are only between tokens (not leading/trailing after strip)
    # Actually after strip, leading/trailing spaces are gone
    # But we need to make sure spaces are only between tokens
    # If there's a space at the start or end (after strip), that shouldn't happen
    # Since we stripped, and the pattern only allows spaces between tokens
    
    # Actually, let me verify: if s = " 1h 30m " after strip it's "1h 30m"
    # tokens = ["1h", "30m"]
    # reconstructed = " " (the space between them)
    # " ".replace(' ', '') = '' ✓
    
    # But what about "1h  30m"? After strip: "1h  30m"
    # tokens = ["1h", "30m"]
    # reconstructed = "  "
    # "  ".replace(' ', '') = '' ✓
    
    # What about "1h 30m s"? After strip: "1h 30m s"
    # tokens = ["1h", "30m"]  (s alone doesn't match \d+[dhms])
    # reconstructed = "  s"
    # "  s".replace(' ', '') = "s" ≠ '' → ValueError ✓
    
    # What about "1h 30m5"? 
    # tokens = ["1h", "30m5"]? No, \d+[dhms] would match "30m" and then "5" is left
    # Actually re.findall(r'\d+[dhms]', "1h 30m5") → ["1h", "30m"]
    # Wait, "30m5" - the regex \d+[dhms] would match "30m" (greedy digits then one unit char)
    # Actually \d+ is greedy, so it matches "30", then [dhms] matches "m". Then "5" is left.
    # tokens = ["1h", "30m"]
    # reconstructed = " 5"
    # " 5".replace(' ', '') = "5" ≠ '' → ValueError ✓
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    last_order = -1
    total = 0
    
    for token in tokens:
        unit = token[-1]
        num_str = token[:-1]
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong order or repeated unit: {unit}")
        last_order = order
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I need to also handle the case where there are no tokens at all. For example, s = "   " → after strip it's "" → caught by the empty check. What about s = "abc"? After strip "abc", `re.fullmatch(r'[0-9dhms ]+', "abc")` → None → ValueError. Good.

What about s = " " (just a space)? After strip it's "" → ValueError. Good.

What about s = "123"? After strip "123", fullmatch passes (all digits). tokens = re.findall(r'\d+[dhms]', "123") → [] (no unit). reconstructed = re.sub(r'\d+[dhms]', '', "123") → "123". "123".replace(' ','') = "123" ≠ '' → ValueError. Good.

What about s = "d"? fullmatch passes. tokens = []. reconstructed = "d". "d" ≠ '' → ValueError. Good.

What about s = "1h 2H"? fullmatch: 'H' is not in [0-9dhms ] → ValueError. Good.

I think this solution is correct. Let me also consider: what if the number is very large? Python handles big integers natively, so no issue.

One more edge case: what about "0s"? That should be valid and return 0. tokens = ["0s"], unit='s', num="0", total=0. ✓

What about "00s"? tokens = ["00s"], num="00", int("00")=0. Should be valid. ✓

I'm satisfied with this solution. Let me clean it up.
