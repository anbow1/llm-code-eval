Let me carefully parse the requirements:

1. Format: `<non-negative integer><unit>` with no space between number and unit
2. Units: d (86400s), h (3600s), m (60s), s (1s)
3. Units must appear in order: d, h, m, s
4. Each unit at most once
5. Any subset is allowed
6. Parts can be written together ("1h30m") or separated by one or more spaces
7. Leading/trailing whitespace allowed
8. "90m" is valid (5400s)
9. Raises ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

1. Strip leading/trailing whitespace
2. If empty after stripping, raise ValueError
3. Split by spaces to get parts? But wait, "1h30m" is written together without spaces. So I can't just split by spaces.

Actually, I think the approach should be:
- After stripping, the string consists of tokens separated by one or more spaces
- But tokens can also be concatenated directly like "1h30m"

So the strategy is:
- Strip the string
- If empty, raise ValueError
- We need to parse the string character by character or use regex

Let me think about using regex:
- The valid pattern is: a sequence of `<integer><unit>` parts, where units are in order d, h, m, s, each appearing at most once
- Parts can be separated by one or more spaces

A regex approach:
- Pattern for the whole string: `^\s*(\d+[dhms])(\s*(\d+[dhms]))*\s*$`

Wait, but I need to enforce order and no repetition. Let me think more carefully.

Actually, let me use a regex to validate the format, then extract parts and check order/uniqueness.

Regex to match the overall structure:
- `^\s*(?:(\d+)([dhms])\s*)+$`

This ensures each part is digits followed by a valid unit, with optional whitespace between parts.

But wait, what about a number without a unit like "42"? The regex `(\d+)([dhms])` wouldn't match that, which is good.

What about "42h30" - number without unit at the end? The regex wouldn't match the full string, which is good.

What about "0s"? That's valid - non-negative integer includes 0.

Let me also think about edge cases:
- "1h30m" - valid, concatenated
- "1h 30m" - valid, space separated
- "1h  30m" - valid, multiple spaces
- " 1h30m " - valid, leading/trailing whitespace
- "" - invalid
- "  " - invalid
- "42" - invalid (number without unit)
- "1H" - invalid (uppercase)
- "1x" - invalid (unknown unit)
- "1h1h" - invalid (repeated unit)
- "30m1h" - invalid (wrong order)
- "1.5h" - invalid (decimal)
- "+1h" - invalid (sign)
- "-1h" - invalid (sign)
- "1,h" - invalid (other separator)
- "1h-30m" - invalid (other separator)
- "001h" - hmm, is this valid? The spec says "non-negative integer". I think leading zeros might be valid. Actually, "001" is still a non-negative integer. Let me allow it.

Wait, what about "0d0h0m0s"? That should be valid and equal 0.

What about "1h 1m 1s"? Valid.

What about "1s30m"? Invalid (wrong order, s before m).

Let me code this:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Regex: sequence of <digits><unit> parts, separated by one or more spaces
    # But they can also be concatenated directly
    # Pattern: one or more groups of (\d+[dhms]) separated by optional whitespace
    
    # Actually, the parts can be written together OR separated by spaces.
    # So the separator between parts is: one or more spaces (or nothing)
    
    pattern = r'^(?:(\d+)([dhms])(?:\s+|$))+$'
    
    # Hmm, this might not work perfectly. Let me think again.
    
    # Better approach: match the whole string
    # The string should be: optional whitespace, then one or more "digit+unit" tokens
    # where tokens are separated by one or more spaces (or nothing, when written together)
    
    # Actually "written together" means no separator at all. "separated by one or more spaces" means there's a space.
    # So between tokens, there can be zero or more spaces.
    
    pattern = r'^\s*(?:(\d+)([dhms])\s*)+$'
    
    match = re.match(pattern, s)
    if not match:
        raise ValueError(f"Invalid duration string: {s!r}")
    
    # Now find all (number, unit) pairs
    pairs = re.findall(r'(\d+)([dhms])', s)
    
    # But wait, this might also match things incorrectly. Let me reconsider.
    
    # Actually, let me re-think the validation.
    
    # Step 1: Validate the overall format with regex
    # Step 2: Extract pairs
    # Step 3: Validate order and uniqueness
```

Hmm, let me think about whether `(\d+)([dhms])` could match something it shouldn't. For example, "12" would not match since there's no unit. "1h30" would match "1h" and then "30" wouldn't match, but in the overall regex it wouldn't pass.

Wait, there's a subtlety. What about "1h30m"? The regex `(?:(\d+)([dhms])\s*)+` would match "1h30m" as: first iteration matches "1h", second iteration matches "30m". Good.

What about "1h  30m"? First iteration: "1h" followed by spaces `\s*` consuming "  ". Second iteration: "30m". Good.

What about "1h0m"? First: "1h", second: "0m". Good.

What about "0h0m0s0d"? This would match the regex format-wise, but it's wrong order. We check that after.

What about "12h"? Matches "12h". Good.

What about "012h"? Matches "012h". `int("012")` = 12. Should this be valid? I'll say yes, it's a non-negative integer.

Let me also consider: what if the string is "1h2h"? The regex would match format-wise (two tokens), but then we check for repeated units and raise ValueError.

What about "90m"? Regex matches, no order issue, single unit. Valid, returns 5400.

What about "1.5h"? The regex `(\d+)([dhms])` - `\d+` matches "1", then we need a unit, but next char is ".". So the regex `(?:(\d+)([dhms])\s*)+$` would try to match starting from "1", find `\d+` = "1", then need `[dhms]` but get ".". So it won't match. Good.

Actually wait - could `(\d+)` match "1" and then `([dhms])` fail on "."? Yes. But then could the regex engine backtrack and try `\d+` = "" ? No, `\d+` requires at least one digit. So "1.5h" won't match. Good.

What about "+1h"? `\d+` doesn't match "+", so the overall regex won't match. Good.

What about "1H"? `\d+` matches "1", then `[dhms]` needs to match "H" - it won't since the character class is lowercase only. Good.

What about "1,h"? After "1", we need `[dhms]` but get ",". Won't match. Good.

I think the approach is solid. Let me also handle the case where `re.findall` on the string might miss something if the regex validation passed. Actually, if the overall regex passed, then `re.findall(r'(\d+)([dhms])', s)` should find all the pairs correctly because the only characters in the string are digits, units, and whitespace.

Wait, but what if we have "1h30m" and we do findall - we get [("1","h"), ("30","m")]. Good.

What about "10h5m30s"? findall gives [("10","h"), ("5","m"), ("30","s")]. Good.

Let me finalize:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")
    
    # Validate format: one or more <digits><unit> parts, separated by optional whitespace
    if not re.match(r'^(?:(\d+)([dhms])\s*)+$', s):
        raise ValueError(f"Invalid duration format: {s!r}")
    
    # Extract all (number, unit) pairs
    pairs = re.findall(r'(\d+)([dhms])', s)
    
    # Validate order and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    seen = set()
    total = 0
    last_order = -1
    
    for num_str, unit in pairs:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Units out of order")
        seen.add(unit)
        last_order = order
        total += int(num_str) * unit_seconds[unit]
    
    return total
```

Wait, I should double-check: does the regex `^(?:(\d+)([dhms])\s*)+$` handle the case of "1h  30m" correctly? Let me trace through:
- Start of string
- First iteration: `\d+` matches "1", `[dhms]` matches "h", `\s*` matches "  "
- Second iteration: `\d+` matches "30", `[dhms]` matches "m", `\s*` matches ""
- End of string ✓

What about "1h30m"?
- First iteration: `\d+` matches "1", `[dhms]` matches "h", `\s*` matches ""
- Second iteration: `\d+` matches "30", `[dhms]` matches "m", `\s*` matches ""
- End of string ✓

What about "42" (number without unit)?
- `\d+` matches "42", then `[dhms]` needs to match but we're at end of string. Fail.
- Backtrack: `\d+` matches "4", `[dhms]` tries to match "2" - fail.
- Backtrack: `\d+` matches "4", hmm wait, `\d+` is greedy but can backtrack. Actually `\d+` would try to match "42" first, then backtrack to "4", but then `[dhms]` needs to match "2" which fails. Then the group fails entirely. The `+` on the outer group needs at least one match. So overall fail. ✓

What about "1h2" (trailing number without unit)?
- First iteration: "1h" matches, `\s*` matches ""
- Second iteration: `\d+` matches "2", then `[dhms]` needs to match but end of string. Fail.
- Backtrack in second iteration: `\d+` could match... no, there's only one digit. 
- Overall: the outer `+` has only one successful iteration ("1h"), then at position 2 we have "2" remaining, and the regex expects end of string (or another group). Since "2" doesn't form a valid group, and we're not at end of string (there's `$` check)... 

Hmm wait, actually with `^(?:(\d+)([dhms])\s*)+$`, after matching "1h" (with `\s*` matching ""), we're at position 2. The `+` means we try another iteration. At position 2, `\d+` matches "2", then `[dhms]` fails (end of string). So this iteration fails. Since `+` needs at least one more... wait no, `+` means the group matched at least once (which it did with "1h"). Now the regex tries to see if we can match `$`. At position 2, we have "2" remaining, so `$` fails.

Actually, I need to be more careful with regex. The pattern is `^(?:(\d+)([dhms])\s*)+$`. After the first iteration matches "1h" and consumes it (plus optional trailing whitespace which is ""), the position is at index 2 (after "1h"). Now the `+` tries another iteration. At position 2: `\d+` matches "2" (position now at 3, end of string). Then `[dhms]` needs to match at position 3 but it's end of string. This iteration fails.

Since `+` can stop (it's "one or more"), we now check `$`. But we're at position 2 (after the first successful iteration consumed "1h"), and the string has length 3 ("1h2"). So `$` fails.

Wait, I need to think about this more carefully. The regex engine after failing the second iteration: does it backtrack the first iteration? 

Actually, I think the behavior is: the `+` quantifier will try to match as many iterations as possible (greedy). If the overall pattern fails at the end, it backtracks to fewer iterations.

Let me re-trace "1h2":
- `^` matches at pos 0
- Iteration 1: `\d+` matches "1" (pos 1), `[dhms]` matches "h" (pos 2), `\s*` matches "" (pos 2)
- Iteration 2: `\d+` matches "2" (pos 3), `[dhms]` fails at pos 3 (EOL)
- `+` has 1 successful iteration. Try `$` at pos 2. String length is 3, so `$` fails.
- Backtrack: try `$` at... hmm, actually there's nothing to backtrack in iteration 1 since `\s*` already matched greedily (empty string).
- Can we backtrack `\d+` in iteration 1 from "1" to nothing? No, `\d+` needs at least one.
- Overall: FAIL. ✓

Great, "1h2" correctly fails.

What about " 1h " (leading/trailing spaces)?
- `s.strip()` gives "1h"
- Then regex matches "1h". ✓

What about " " (only spaces)?
- `s.strip()` gives ""
- We check `if not s` and raise ValueError. ✓

I think this solution is correct. Let me also make sure about the `re.findall` behavior. If the overall regex passed, can findall ever return fewer pairs than expected? 

If the regex passed, the string only contains digits, lowercase dhms, and whitespace. And every digit sequence is immediately followed by a unit. So `findall(r'(\d+)([dhms])', s)` will correctly find all pairs.

Actually, wait. What about a case like "10h5m30s"? 
- findall would find: ("10", "h"), ("5", "m"), ("30", "s") ✓

What about "007s"?
- findall: ("007", "s"), int("007") = 7. Valid.

I'm satisfied with this solution. Let me write the final version.

One more thought: should I handle the case where the regex pattern itself has issues? Let me also consider "1d2d" - regex matches (two tokens), but we detect repeated unit 'd'. ✓

And "1m1h" - regex matches, but order check catches m(2) then h(1), since 1 <= 2... wait, last_order starts at -1. First pair: m, order=2, 2 > -1 OK, last_order=2. Second pair: h, order=1, 1 <= 2, raise ValueError. ✓

Let me write the clean final version.
