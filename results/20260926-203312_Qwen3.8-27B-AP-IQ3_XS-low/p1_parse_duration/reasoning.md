Let me analyze the requirements:

1. Parse duration strings like "2d", "1h30m", "45s", "1d4s", "1h 30m"
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order: d, h, m, s
4. Each unit at most once
5. Parts can be together or separated by one or more spaces
6. Leading/trailing whitespace allowed
7. No normalization - "90m" is valid
8. Raise ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the approach:

1. Strip the string
2. If empty after strip, raise ValueError
3. Split by one or more spaces (but only spaces, not tabs or other whitespace)
4. Actually, let me re-read: "separated by one or more spaces" - so the separator is specifically spaces
5. Wait, "Leading/trailing whitespace is allowed" - so I should strip whitespace first
6. "other separators" raises ValueError - so tabs, newlines, etc. would be invalid

Let me think more carefully:
- Strip leading/trailing whitespace
- If the result is empty, raise ValueError
- The parts are separated by one or more spaces
- But wait, if I split by spaces and there's a tab, that would be "other separator"

Actually, let me reconsider. The string after stripping should only contain digits, the unit letters (d, h, m, s), and spaces (as separators).

Let me use a regex approach:
- First strip the string
- If empty, ValueError
- Split by one or more spaces
- Each part should match `\d+[dhms]`
- Check that units are in correct order and not repeated
- Sum up the seconds

Wait, but I need to be careful about what constitutes valid input:
- "90m" → 5400
- "1h 30m" → 5400
- "1h30m" → 5400
- "2d" → 172800

Invalid:
- "" or " " → ValueError
- "1x" → unknown unit
- "1m2h" → wrong order
- "1h1h" → repeated unit
- "h" → missing number
- "1" → number without unit
- "1.5h" → decimals
- "-1h" → signs
- "1H" → uppercase
- "1\th" → other separator

Let me think about the parsing:
1. Strip the string
2. If empty, raise ValueError
3. Check if there are any characters other than digits, [dhms], and spaces
4. Split by one or more spaces
5. For each part, validate it matches `\d+[dhms]`
6. Check order and uniqueness of units
7. Calculate total seconds

Actually, let me be more careful. If I split by spaces and there's a tab in the string, the tab would be part of a "part" and the regex would fail. Let me just use a regex to match the entire string.

Pattern: `^\s*(\d+[dhms])(\s+\d+[dhms])*$`

Wait, but I need to validate that:
- Units are in order d, h, m, s
- No repeated units
- Only valid units (d, h, m, s)

Let me use a different approach:
1. Strip the string
2. If empty, ValueError
3. Use regex to find all parts: `\d+[a-z]` or better, I'll validate character by character

Actually, let me use a cleaner approach:

1. Strip the string
2. If empty, ValueError
3. Split by one or more spaces (using regex `re.split(r' +', s)`)
4. But wait - if there's a tab, the split won't split on it, and the tab will be in a part, causing the regex to fail. Good.
5. Actually, I need to also check that the only non-alphanumeric characters are spaces. Let me check: after splitting by ` +`, each part should match `^\d+[dhms]$`.

Wait, but what about "1\th"? If I strip, I get "1\th". Split by ` +` gives ["1\th"]. Then regex `^\d+[dhms]$` fails because of the tab. Good, ValueError.

What about "1 h 30m"? Strip gives "1 h 30m". Split by ` +` gives ["1", "h", "30m"]. "1" doesn't match `^\d+[dhms]$`, so ValueError. Good.

What about "  1h  30m  "? Strip gives "1h  30m". Split by ` +` gives ["1h", "30m"]. Both match. Good.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    parts = re.split(r' +', s)
    
    units_order = ['d', 'h', 'm', 's']
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen_units = []
    total = 0
    
    for part in parts:
        match = re.fullmatch(r'(\d+)([dhms])', part)
        if not match:
            raise ValueError(f"Invalid part: {part}")
        num = int(match.group(1))
        unit = match.group(2)
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        if seen_units:
            # Check order
            last_idx = units_order.index(seen_units[-1])
            curr_idx = units_order.index(unit)
            if curr_idx <= last_idx:
                raise ValueError(f"Wrong order: {unit} after {seen_units[-1]}")
        seen_units.append(unit)
        total += num * unit_values[unit]
    
    return total
```

Wait, I need to double-check: "1h 30m" - strip gives "1h 30m", split by ` +` gives ["1h", "30m"]. Both match. Good.

What about "1h30m"? Strip gives "1h30m". Split by ` +` gives ["1h30m"]. `re.fullmatch(r'(\d+)([dhms])', "1h30m")` - this would fail because "1h30m" is not just digits followed by one letter. Hmm, that's a problem!

Wait, let me re-read the problem. "Parts may be written together ("1h30m")". So "1h30m" should be valid.

So I can't just split by spaces and expect each part to be a single number+unit. I need to parse the concatenated parts too.

Let me reconsider. The string after stripping should be parseable as a sequence of (number + unit) pairs, where consecutive pairs are either directly adjacent or separated by one or more spaces.

Better approach: use a regex to find all matches of `\d+[dhms]` in the string, but also verify that the entire string (after stripping) is composed only of these matches and spaces.

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Find all number+unit tokens
    tokens = re.findall(r'\d+[dhms]', s)
    
    # Verify that removing all tokens and spaces from s leaves nothing
    # i.e., s should be composed only of tokens and spaces
    # Remove all tokens, then check remaining is only spaces
    remainder = re.sub(r'\d+[dhms]', '', s)
    if re.search(r'[^\s]', remainder):
        raise ValueError("Invalid characters in string")
    
    # Also check that spaces are only used as separators (not at start/end after strip, which we already handled)
    # Actually after strip, there shouldn't be leading/trailing spaces
    
    # Check tokens are in correct order
    ...
```

Wait, but there's a subtlety. Consider "1h 30m". The tokens are ["1h", "30m"]. The remainder after removing tokens is " " (one space). That's fine.

But what about "1h  30m"? Tokens: ["1h", "30m"]. Remainder: "  " (two spaces). Fine.

What about "1h\t30m"? Tokens: ["1h", "30m"]. Remainder: "\t". `re.search(r'[^\s]', "\t")` - tab is \s, so no match. Hmm, but the problem says "other separators" should raise ValueError.

Wait, let me re-read: "Parts may be written together ("1h30m") or separated by one or more spaces". So the separator is specifically spaces, not tabs.

So I need to check that the remainder (after removing tokens) contains only spaces, not other whitespace.

```python
remainder = re.sub(r'\d+[dhms]', '', s)
if re.search(r'[^ ]', remainder):
    raise ValueError("Invalid separator")
```

This checks that only spaces remain. If there's a tab, it would be caught.

Let me also think about edge cases:
- "0s" → 0, valid
- "00s" → 0, valid (leading zeros in number?)
- The problem says "non-negative integer", so "007" should be valid? Let me assume yes since it's still a non-negative integer representation.

Actually wait, does the problem say anything about leading zeros? It says "non-negative integer". I'll allow them since the regex `\d+` matches them.

Let me also think: what if the remainder is empty (no spaces, like "1h30m")? Then `re.search(r'[^ ]', "")` returns None, which is fine.

Let me finalize:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    units_order = ['d', 'h', 'm', 's']
    
    tokens = re.findall(r'\d+[dhms]', s)
    
    # Check remainder is only spaces
    remainder = re.sub(r'\d+[dhms]', '', s)
    if re.search(r'[^ ]', remainder):
        raise ValueError("Invalid character in string")
    
    # Check no empty tokens (shouldn't happen with findall, but just in case)
    # Check order and uniqueness
    seen = set()
    last_idx = -1
    total = 0
    
    for token in tokens:
        unit = token[-1]
        num = int(token[:-1])
        
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        
        curr_idx = units_order.index(unit)
        if curr_idx <= last_idx:
            raise ValueError(f"Units out of order")
        
        seen.add(unit)
        last_idx = curr_idx
        total += num * unit_values[unit]
    
    return total
```

Wait, I need to make sure tokens is not empty. If s is "abc", tokens would be empty, and remainder would be "abc" which contains non-space characters, so it would raise. Good.

What if s is " " (just a space)? After strip, it's empty, so ValueError. Good.

What if s is "1"? tokens = [] (no match since "1" doesn't have a unit letter). remainder = "1". `re.search(r'[^ ]', "1")` matches. ValueError. Good.

What if s is "h"? tokens = []. remainder = "h". ValueError. Good.

What if s is "1.5h"? tokens = ["1"] wait no... `re.findall(r'\d+[dhms]', "1.5h")` - let me think. `\d+` matches "1", then `[dhms]` needs to match "5" - no. So it tries starting at "5", `\d+` matches "5", `[dhms]` matches "h". So tokens = ["5h"]. remainder = "1." which contains non-space non-token chars. `re.search(r'[^ ]', "1.")` matches "1". ValueError. Good.

What about "1H30m"? `re.findall(r'\d+[dhms]', "1H30m")` - "1" then "H" doesn't match [dhms]. Starting at "3", "30" then "m" matches. tokens = ["30m"]. remainder = "1H". `re.search(r'[^ ]', "1H")` matches. ValueError. Good.

What about "1h1H"? tokens = ["1h"]. remainder = "1H". Contains non-space. ValueError. Good.

I think this solution is correct. Let me also handle the case where tokens is empty (e.g., s = "abc" after strip). Actually if s is all spaces it would be caught by the empty check. If s has non-space non-digit non-unit chars, the remainder check catches it. If s has only digits but no units (like "123"), tokens would be empty and remainder would be "123", caught.

One more edge case: what about "  1h  " → strip → "1h". tokens = ["1h"]. remainder = "". Good, returns 3600.

I think the solution is solid. Let me write the final version.
