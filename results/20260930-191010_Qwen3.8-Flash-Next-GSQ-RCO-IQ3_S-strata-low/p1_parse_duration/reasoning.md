Let me carefully analyze the requirements:

1. Parse duration strings like "1h30m", "1d2h3m4s", "45s", etc.
2. Units: d (86400), h (3600), m (60), s (1)
3. Rules:
   - Parts are `<non-negative integer><unit>` with no space between number and unit
   - Units must appear in order d, h, m, s
   - Each unit at most once
   - Parts can be together or separated by spaces
   - Leading/trailing whitespace allowed
   - No normalization (90m is valid)
   - Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty, raise ValueError
3. Remove spaces (since parts can be separated by spaces or not, I can just remove all spaces to normalize)
4. Now I have a string of alternating digit sequences and single characters (units)
5. Parse it as a sequence of (number, unit) pairs
6. Validate: order must be d, h, m, s; no repeated units; all units must be valid

Let me think about edge cases:
- "1h30m" → 5400
- "1d 2h 3m 4s" → 86400 + 7200 + 180 + 4 = 93784
- "0s" → 0 (non-negative integer includes 0)
- "" → ValueError
- " " → ValueError
- "1h" → 3600
- "90m" → 5400
- "30m1h" → ValueError (wrong order)
- "1h1h" → ValueError (repeated unit)
- "1H" → ValueError (uppercase)
- "1.5h" → ValueError (decimal)
- "-1h" → ValueError (sign)
- "1" → ValueError (number without unit)
- "h" → ValueError (unit without number)
- "1x" → ValueError (unknown unit)

Approach:
1. Strip whitespace. If empty, raise ValueError.
2. Remove all spaces.
3. Parse the string into tokens: sequences of digits followed by a single non-digit character.
4. Validate each token.

Let me think about parsing more carefully:
- After removing spaces, iterate through the string
- Collect digits until non-digit found
- The non-digit should be a valid unit character
- If there are digits but no unit after → ValueError
- If there's a unit with no preceding digits → ValueError

Wait, but I need to be careful about "other separators" like commas, tabs, etc. The problem says "Parts may be written together or separated by one or more spaces." So only spaces are valid separators. Other separators (like commas, tabs, underscores) should raise ValueError.

So I should:
1. Strip leading/trailing whitespace (spaces, tabs, newlines)
2. Check if empty → ValueError
3. Now, for internal separators, only spaces are allowed. So if there's a tab, comma, etc. inside the string → ValueError.

Let me refine:
1. Strip leading/trailing whitespace
2. If empty, raise ValueError
3. Check for invalid characters in the string (anything that's not a digit, unit letter, or space)
4. Remove all spaces
5. Parse as (number, unit) pairs
6. Validate order and uniqueness

Actually, let me reconsider. After stripping, if there are tabs inside, they should cause ValueError. Let me think...

The rules say "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")." So only spaces are valid separators. Any other character between parts is invalid.

So the valid characters in the string are: digits (0-9), unit letters (d, h, m, s), and spaces.

Let me code this:

```python
def parse_duration(s: str) -> int:
    # Strip leading/trailing whitespace
    s = s.strip()
    
    # Empty check
    if not s:
        raise ValueError("empty or blank string")
    
    # Check for invalid characters (anything not digit, valid unit, or space)
    for ch in s:
        if not ch.isdigit() and ch not in 'dhms' and ch != ' ':
            raise ValueError(f"invalid character: {ch}")
    
    # Remove spaces
    s = s.replace(' ', '')
    
    # Now parse (number, unit) pairs
    # The string should be a sequence of digit-groups followed by unit characters
    
    # Parse
    result = 0
    i = 0
    prev_order = -1
    order_map = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    if not s:  # after removing spaces, if string is empty (was all spaces)
        raise ValueError("empty or blank string")
    
    while i < len(s):
        # Collect digits
        if not s[i].isdigit():
            raise ValueError("missing number before unit")
        
        num_str = ''
        while i < len(s) and s[i].isdigit():
            num_str += s[i]
            i += 1
        
        # Now expect a unit
        if i >= len(s):
            raise ValueError("number without unit")
        
        unit = s[i]
        if unit not in 'dhms':
            raise ValueError(f"unknown unit: {unit}")
        i += 1
        
        # Validate order
        if order_map[unit] <= prev_order:
            raise ValueError("wrong order or repeated unit")
        prev_order = order_map[unit]
        
        result += int(num_str) * unit_seconds[unit]
    
    return result
```

Wait, I need to double-check: after `s.strip()`, if the original string was only whitespace, `s` becomes empty and we raise ValueError. Good.

After removing spaces, if the string had only spaces between non-empty content... wait no, strip removes leading/trailing, and then we check for empty. But what about a string like " "? After strip it's empty → ValueError. Good.

What about "1h 30m"? After strip: "1h 30m". Characters are valid (digits, h, m, space). Remove spaces: "1h30m". Parse: 1*3600 + 30*60 = 5400. Good.

What about "1 h 30 m"? After strip: "1 h 30 m". Characters valid. Remove spaces: "1h30m". Good.

What about "1h 30 m"? Same thing. Good.

What about "12h"? Parse: i=0, digits "12", unit 'h'. Valid. Good.

What about "0s"? Parse: num "0", unit 's', 0 * 1 = 0. Good.

What about "1H"? The 'H' is not in 'dhms' and not a digit and not a space → ValueError from the character check. Good.

What about "1.5h"? The '.' is not in valid chars → ValueError. Good.

What about "+1h"? The '+' is not in valid chars → ValueError. Good.

What about "1h,h"? The ',' is not in valid chars → ValueError. Good.

What about "30m1h"? After parsing: first pair (30, 'm'), then (1, 'h'). For 'h', order_map['h'] = 1, prev_order = 2 (from 'm'). 1 <= 2 → ValueError. Good.

What about "1h1h"? First pair (1, 'h'), prev_order = 1. Second pair (1, 'h'), order_map['h'] = 1, 1 <= 1 → ValueError. Good.

I think this solution is correct. Let me also consider: what if there's a tab character in the middle like "1h\t30m"? The tab is not a digit, not in 'dhms', not a space (well, `\t != ' '`), so it would fail the character check. Good.

One more edge: what about just spaces after strip? `"   "`.strip() = "" → caught by empty check. Good.

Let me finalize the code.
