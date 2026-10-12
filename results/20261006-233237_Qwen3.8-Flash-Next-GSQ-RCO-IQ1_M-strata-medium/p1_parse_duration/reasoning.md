Let me analyze this problem carefully.

The function `parse_duration(s: str) -> int` converts a duration string to total seconds.

Rules:
1. A part is `<non-negative integer><unit>` with NO space between number and unit.
2. Units: d (86400s), h (3600s), m (60s), s (1s). Lowercase only.
3. Units must appear in order d, h, m, s. Each unit at most once. Any subset is allowed.
4. Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed.
5. No normalization: "90m" is valid (5400s).
6. Anything else raises ValueError: empty or blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators.

Let me think about the parsing:
- The string can have spaces between parts, so I should first split by whitespace to get tokens, or I can parse the whole string.
- Actually, parts can be written together OR separated by spaces. So "1h30m" is valid AND "1h 30m" is valid.
- Leading/trailing whitespace is allowed.

Approach:
1. Strip whitespace from the string.
2. If empty after stripping, raise ValueError.
3. Now I need to parse the remaining string. Parts can be adjacent (no separator) or separated by spaces.

Wait, actually let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m"). Leading/trailing whitespace is allowed."

So the valid input format is: optional whitespace, then parts (each part is `<non-negative integer><unit>`), optionally separated by whitespace, then optional trailing whitespace.

Since "1h30m" is valid (no separator) and "1h 30m" is valid (space separator), and "1h" is valid, "1d4s" is valid...

The tricky part: how do I parse "1h30m"? After the 'h', I see '3', which could start a new part. But what about "10"? Is that "10s"? No, a number without a unit is invalid.

Let me think about parsing strategy:
- After stripping whitespace, I scan character by character.
- I need to identify parts: digits followed by a unit letter.
- Spaces between parts are allowed (one or more spaces).

Algorithm:
1. Strip the input string.
2. If empty, raise ValueError.
3. Parse the stripped string character by character:
   - Skip spaces (but only between parts, not at start since we already stripped... wait, actually after stripping there shouldn't be leading/trailing spaces).
   - Read digits (one or more).
   - Read exactly one unit character (d, h, m, s).
   - Record the (value, unit) pair.
   - Then optionally skip spaces.
4. Validate:
   - Units must be in order d < h < m < s (by index).
   - No repeated units.
   - All characters must be consumed (digits + unit + optional spaces).
   - No invalid characters.

Wait, let me think more carefully. The string after stripping should match: `<part>(\s*<part>)*`

Where `<part>` is `[0-9]+[dhms]`.

So I can:
1. Strip the string.
2. If empty, raise ValueError.
3. Split by whitespace to get tokens? No, because "1h30m" is one token with no spaces.

Actually, I think the best approach is a single-pass parser:

```python
def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError
    
    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    i = 0
    last_unit_order = -1
    n = len(stripped)
    
    while i < n:
        # Skip spaces (between parts)
        if stripped[i] == ' ':
            i += 1
            continue
        
        # Read digits
        if not stripped[i].isdigit():
            raise ValueError
        
        num_start = i
        while i < n and stripped[i].isdigit():
            i += 1
        
        if i >= n:
            raise ValueError  # number without unit
        
        unit_char = stripped[i]
        if unit_char not in units:
            raise ValueError
        
        i += 1
        
        # Validate order
        cur_order = unit_order[unit_char]
        if cur_order <= last_unit_order:
            raise ValueError
        
        last_unit_order = cur_order
        total += int(stripped[num_start:i-1]) * units[unit_char]
    
    return total
```

Wait, I need to be careful. After stripping, the string should only contain digits, unit characters, and spaces. Any other character is invalid.

Let me check edge cases:
- "1h30m" → parse "1h" (num=1, unit=h), then "30m" (num=30, unit=m). Order: h(1) < m(2). OK. Total = 3600 + 1800 = 5400.
- "1h 30m" → after strip, "1h 30m". Parse "1h", skip space, parse "30m". OK.
- "1d4s" → parse "1d", parse "4s". Order: d(0) < s(3). OK.
- "" → strip → "" → raise ValueError.
- "   " → strip → "" → raise ValueError.
- "1h3h" → parse "1h", then "3h". Order: h(1) <= h(1). Raise ValueError.
- "1m1h" → parse "1m", then "1h". Order: m(2) > h(1)? No, 1 <= 2, so raise ValueError. Wait, last_unit_order starts at -1. After "1m", last_unit_order = 2. Then "1h": cur_order = 1. 1 <= 2, raise ValueError. Correct.
- "10" → parse "10", i >= n, raise ValueError (number without unit). Correct.
- "0s" → valid, returns 0. Hmm, is "0s" valid? The problem says "non-negative integer", so 0 is allowed. And "0s" gives 0 seconds. That seems valid.
- "h" → not a digit, raise ValueError. Correct.
- "1H" → unit 'H' not in units, raise ValueError. Correct.
- "1.5h" → parse "1", then unit is '.', not in units, raise ValueError. Correct.
- "1,2s" → parse "1", unit is ',', not in units, raise ValueError. Correct.
- "1h+m" → parse "1h", then '+' is not a digit or space, raise ValueError. Correct.
- "-1s" → after strip, "-1s". '-' is not a digit, raise ValueError. Correct.
- "+1s" → '+' is not a digit, raise ValueError. Correct.

What about tabs? The problem says "separated by one or more spaces". Does "spaces" mean only ' ' or any whitespace? I think for safety, I'll only allow ' ' as separator, and any other whitespace character (like \t, \n) would be invalid. Actually, the problem says "Leading/trailing whitespace is allowed" - this could mean any whitespace. But "separated by one or more spaces" specifically says spaces.

Hmm, let me be conservative: for stripping, I'll use Python's `.strip()` which handles all whitespace. For separators between parts, I'll only allow spaces (' '). Any other whitespace between parts would cause a parse error (not a digit, not a unit, not a space).

Wait, but if the input is "1h\t30m", after strip it's "1h\t30m". My parser would see '1', 'h', then '\t' which is not a space, not a digit → raise ValueError. That seems reasonable given the problem says "separated by one or more spaces".

Actually, let me re-read: "separated by one or more spaces". I think this means literally space characters. And "Leading/trailing whitespace" - I'll handle this with strip() since the problem says "whitespace" for leading/trailing.

Actually wait, if input is "\n1h30m\n", strip() removes \n, giving "1h30m". That's fine.

But what about "\t1h30m"? strip() removes \t, giving "1h30m". Fine.

What about "1h\t30m"? strip doesn't remove internal tab. My parser sees '1', 'h', then '\t' (not space, not digit) → error. I think that's correct per the problem statement.

Hmm, actually I realize there might be an issue with my space-skipping logic. After a valid part like "1h", the next character could be:
- A digit (start of next part with no separator) → valid
- A space (separator) → skip spaces, then expect a digit or end
- End of string → done

Let me also consider: what if after stripping, we have "  " (multiple spaces)? After strip, it becomes "". Empty → raise ValueError. Good.

What about "1h " (trailing space after strip)? strip removes it → "1h". Fine.

Let me also handle: what if there's a space at the very beginning before strip? strip handles it.

One more edge case: "1h " after strip is "1h". Fine.
" 1h" after strip is "1h". Fine.

What about the case where after skipping spaces we reach the end? Like "1h " → after strip "1h", parse "1h", i=n, loop ends. Good.
"1h  " → after strip "1h", same. Good.

What about "1h " that doesn't get stripped properly? In Python, "1h ".strip() = "1h". Good.

What about "1h  30m" (multiple spaces)? After strip: "1h  30m". Parse "1h", then skip spaces (two spaces), then parse "30m". Good.

I think my algorithm is correct. Let me also make sure about the "no space between number and unit" rule. My parser requires the unit character immediately after the digits. If there's a space between number and unit like "1 h", after strip: "1 h". My parser reads digit '1', then space → not a digit → wait, actually my parser reads digits, then expects a unit character. After reading '1', i=1, stripped[1]=' '. ' ' is not in units → raise ValueError. 

Wait, let me trace through more carefully:
- i=0: stripped[0]='1', is digit. num_start=0. Read digits: i goes to 1. Now i=1, stripped[1]=' '. Unit check: ' ' not in units → raise ValueError. Correct! "1 h" is invalid.

What about "01h"? My parser reads "01" as digits, then 'h'. int("01") = 1. So "01h" = 3600s. Is this valid? The problem says "non-negative integer". Leading zeros in integers are typically valid. I'll allow it.

What about "00h"? Also valid, gives 0.

I think my solution is complete. Let me finalize it.

Actually, one more thought: what about "s" alone (unit without number)? stripped[0]='s', not a digit → raise ValueError. Correct.

What about "1h2" (number at end without unit)? Parse "1h", then '2' is a digit, num_start=3, read digit, i=4=n. Then i >= n → raise ValueError. Correct.

I think the solution is correct. Let me write the final code.
