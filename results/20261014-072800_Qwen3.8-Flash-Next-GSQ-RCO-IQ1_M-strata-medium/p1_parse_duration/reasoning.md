Let me analyze the requirements carefully:

1. Parse a duration string to total seconds
2. Format: <non-negative integer><unit> with NO space between number and unit
3. Units: d (86400), h (3600), m (60), s (1)
4. Units must appear in order d, h, m, s
5. Each unit at most once
6. Any subset is allowed
7. Parts may be together ("1h30m") or separated by spaces
8. Leading/trailing whitespace allowed
9. No normalization: "90m" is valid
10. Raises ValueError for: empty/blank string, unknown unit, wrong order, repeated unit, missing number, number without unit, decimals, signs, uppercase units, other separators

Let me think about the parsing approach:

- First, strip whitespace
- If empty after stripping, raise ValueError
- I need to tokenize: find numbers followed by units
- But I need to be strict: no spaces between number and unit, but spaces between parts are allowed

Approach:
1. Strip the string
2. If empty, raise ValueError
3. I need to parse it character by character or use regex

Let me think about using regex to validate the entire string structure:
- The pattern would be: optional whitespace, then parts separated by spaces
- Each part is: digits followed by one unit character
- Units must be in order d, h, m, s

Actually, let me think more carefully. The input could be "1h 30m" or "1h30m" or " 1h 30m ". 

A good approach:
1. Strip whitespace
2. Use regex to find all tokens of pattern `(\d+)([a-z]+)` - but wait, I need to validate that between tokens there are only spaces.

Let me think about this differently:

Step 1: Strip leading/trailing whitespace
Step 2: If empty, raise ValueError
Step 3: Parse the string by extracting number+unit tokens, validating that between them there's only whitespace.

Actually, let me use a regex-based approach:
- `^(\d+[dhsms])((?: +\d+[dhsms])*)$` - no, this is too restrictive for "1h30m" without spaces.

Wait, "1h30m" is valid - parts written together. So the format is: one or more tokens of `\d+[dhms]`, optionally separated by spaces.

So the regex for the whole string would be: `^(\d+[dhms]\s*)*(\d+[dhms])$` ... no that's getting complex.

Actually: `^(\d+[dhms](?: +)?)+$` with the last one not having a trailing space. Or simpler: `^(\d+[dhms](?:\s+)?)*$` but that would allow trailing space.

Let me try: `^(\d+[dhms](\s+)?)+$` - this would allow "1h30m " with trailing space. But we already stripped.

Actually after stripping, the pattern is: `(\d+[dhms])((?:\s+\d+[dhms])*)` 
Or equivalently: `^(\d+[dhms])(?:\s*\d+[dhms])*$` - wait, between tokens we can have spaces or nothing. "1h30m" has no space between tokens. "1h 30m" has one or more spaces.

So between tokens: zero or more spaces. But we need to ensure we don't have "1h  30m" having more than... actually the problem says "one or more spaces" as a separator, but "parts may be written together". So between two number+unit tokens, it's either nothing or one-or-more spaces.

Actually re-reading: "Parts may be written together ("1h30m") or separated by one or more spaces ("1h 30m")."

So the separator is either empty (adjacent) or one or more spaces. After stripping, there should be no leading/trailing spaces.

Pattern: `^(\d+[dhms])(?: ?(\d+[dhms]))*$`... no. Between tokens it's 0+ spaces but if 0 spaces that's adjacent, if 1+ spaces that's the separator.

Actually the simplest regex after stripping: `^(\d+[dhms](?:\s+\d+[dhms])*)$` - no that doesn't handle "1h30m".

Let me just do: `^(\d+[dhms](?:\s*)?)+$` after strip - no, this would match "1h   30m" which is fine (one or more spaces) and "1h30m" (zero spaces). But it would also match "1h  " with trailing - already stripped. And empty - already checked.

Wait, actually `^(\d+[dhms](?:\s*)?)+$` - the `(?:\s*)?` means optionally zero or more spaces after each token. But after the last token, there should be nothing. Since we stripped, there shouldn't be trailing whitespace. Let me think...

"1h30m" -> token1="1h", spaces="", token2="30m" -> matches
"1h 30m" -> token1="1h", spaces=" ", token2="30m" -> matches
"1h  30m" -> token1="1h", spaces="  ", token2="30m" -> matches (one or more spaces is valid separator)

But what about "1h " after stripping -> "1h" -> just one token, matches.
What about just spaces? After strip it's empty, we check that.

What about "1h 30m 45s"? token1="1h", spaces=" ", token2="30m", spaces=" ", token3="45s" -> matches.

Hmm but `(\d+[dhms](?:\s*)?)+` - after the last token, `(?:\s*)?` could match empty. That's fine.

Actually wait - could this match something bad? "1hh30m" - "1h" matches first part, then "h30m" - no, "h" doesn't match `\d+`. So it wouldn't match. Good.

"1h 3 0m" - after strip, "1h 3 0m". First match: "1h", then " ", then "3" - but "3" doesn't match `\d+[dhms]`. Actually the regex would try to match `(\d+[dhms](?:\s*)?)+`. Let me trace: "1h" matches, " " matches `\s*`, then "3 0m" - "3 " doesn't end with [dhms]... wait, `\d+[dhms]` needs digits immediately followed by unit char. "3 0m" - trying to match `\d+[dhms]`: "3" then needs [dhms] but next is " ", fail. So regex doesn't match. Good.

But wait, what about "12x30m"? "12x" - "12" then "x" is not [dhms], fail. Good.

What about "1h30m45s"? First: "1h" matches, no space, "30m" matches, no space, "45s" matches. Regex matches. Then I check ordering. Good.

What about decimals: "1.5h30m"? "1.5h" - `\d+` matches "1", then "." is not [dhms], fail at that position. The regex tries from start: "1" then needs [dhms] but gets ".", fail. No match from position 0. Good, raises ValueError.

What about "-1h"? After strip, "-1h". Regex tries from start: `\d+` doesn't match "-". Fail. Good.

What about "1H"? "1" then "H" not in [dhms]. Fail. Good.

OK so the regex approach:
1. Strip input
2. If empty -> ValueError
3. Try to match `^(\d+[dhms](?:\s*)?)+$` - if no match -> ValueError
4. Extract all tokens using `re.findall(r'(\d+)([dhms])', s)` - but need to ensure they're in order and no repeats.

Wait, there's a subtlety. What about "1h0m"? That's valid - 0 is a non-negative integer. "0m" is valid. "0h0m" valid. "0s" valid. But what about "0d0h0m0s"? Valid by the rules.

What about just "0"? No unit, so no match. Good.

What about "1h  30m"? Between tokens there are two spaces. The spec says "separated by one or more spaces". Two spaces is one or more. So valid. My regex handles this.

Hmm wait, what about "1h  30m" - after my regex match, findall gives [("1","h"), ("30","m")]. That's correct.

Now for ordering: I need to check that the units appear in order d, h, m, s. I can assign each unit an index: d=0, h=1, m=2, s=3. Then check that the sequence of indices is strictly increasing.

Also check no repeats: if two tokens have the same unit, that's a repeat -> ValueError. But strictly increasing check already covers this.

Let me code this up:

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty duration")
    
    # Validate overall structure
    if not re.match(r'^(\d+[dhms](?:\s*)?)+$', s):
        raise ValueError("Invalid format")
    
    tokens = re.findall(r'(\d+)([dhms])', s)
    
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    
    total = 0
    last_order = -1
    for number_str, unit in tokens:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("Wrong order or repeated unit")
        last_order = order
        total += int(number_str) * unit_values[unit]
    
    return total
```

Wait, let me double-check the regex. `^(\d+[dhms](?:\s*)?)+$` - after stripping, there should be no leading/trailing whitespace. Between tokens, `(?:\s*)?` matches zero or more spaces. This handles both adjacent tokens and space-separated tokens.

But wait - could there be an issue where a space is part of the "between" but creates ambiguity? Like "1h 30m" - regex matches "1h" with " " as the `\s*`, then "30m" as next token. findall on the original string gives ("1","h") and ("30","m"). Correct.

What about "1h3 0m"? After strip. Regex: "1h" matches, no space, then "3 0m" - trying `\d+[dhms]`: "3" then " " not [dhms], fail. Then trying from " 0m": "0m" matches. So the regex... wait let me trace more carefully.

`^(\d+[dhms](?:\s*)?)+$` on "1h3 0m":
- Start: "1" matches \d+, "h" matches [dhms], then "(?:\s*)?" tries to match " " -> matches " ". Now we're at position 3 ("3 0m"). Next iteration of +: "3" matches \d+, " " does NOT match [dhms]. Fail this iteration. 
- Backtrack: "(?:\s*)?" matched empty at position 2 ("h3 0m"). Next iteration: "3" matches \d+, " " not [dhms]. Fail.
- Backtrack: "1h" was first group, but maybe the whole thing fails.
- Actually the regex engine will try to match starting from beginning. After first group matches "1h" (position 2), then `\s*` greedily matches " " (position 3). Then next group tries at position 3: "3" matches \d+, next char is " " which is not [dhms]. Fail. Backtrack: \s* matches nothing (position 2). Next group at position 2: "3" matches \d+, next char is " " not [dhms]. Fail.
- Then try with first group being just "1h" but then the + stops (only one iteration). Check `$`: we're at position 2, string is "1h3 0m", position 2 is "3", not end. Fail.
- So overall: no match. Good, raises ValueError. 

What about "12 34"? After strip. Regex: "12" matches \d+, " " not [dhms]. Fail immediately. No match. Good.

What about "1h " (trailing space after strip removes it) -> "1h" matches. Fine.

I think the solution is correct. Let me also consider: what if there's a tab character between parts? The spec says "one or more spaces". `\s` matches tabs too. Should I restrict to only space characters? The spec says "separated by one or more spaces". I think using a literal space in the regex would be safer: `(?: +)?` instead of `(?:\s*)?`. But since we already stripped, there shouldn't be tabs at the end. But what about tabs in the middle? The spec says spaces. Let me use ` ` (literal space) to be safe. Actually the problem says "separated by one or more spaces" - I'll interpret that as literal spaces only.

Hmm, but actually `\s*` would also allow newlines and tabs. Let me use `(?: *)*` or `( +)?` to only allow literal spaces. Actually between tokens it should be 0 or more spaces (0 for adjacent, 1+ for separated). Let me use ` *` (zero or more literal spaces).

`^(\d+[dhms]( *)?)+$` - hmm this is the same as `^(\d+[dhms] *)+$` since `( *)?` is just ` *`. Let me use `^(\d+[dhms] *)+$` but that would allow trailing spaces (before the `+` tries again). Actually after strip there are no trailing spaces. And `+$` - the last ` *` could match empty then `$`. Fine.

Actually `^(\d+[dhms] *)+$` on "1h" : "1h" + "" -> then `$`. OK.
On "1h 30m": "1h " + "30m" + "" -> `$`. Wait, no. Let me re-trace. `(\d+[dhms] *)` matches "1h " (with the space). Then `+` means one or more. Next iteration at "30m": "30m" matches `\d+[dhms]` then " *" matches empty. Then `$` checks end. Yes! Matches.

On "1h30m": first group "1h" + " *" (empty). Second group "30m" + " *" (empty). `$` matches. Good.

On "1h  30m": first group "1h  " (two spaces). Second "30m". `$`. Good.

OK so regex: `^(\d+[dhms] *)+$`

Actually I realize I should double check: is ` *` after each token going to cause issues? Like "1h " after strip -> "1h" only (strip removed trailing). So "1h" matches: "1h" + "" -> end. Good.

Let me finalize the solution.

One more edge case: "0d0h0m0s" - all valid, returns 0. Fine.
"0" - no unit, regex fails. ValueError. Good.
"00s" - number is "00", int("00") = 0, valid. Fine.
"007s" - number is "007", int = 7, valid. The spec says "non-negative integer" - leading zeros are part of integer representation. I'll allow it since the spec doesn't say no leading zeros. Actually, "non-negative integer" - does "007" count? In most contexts yes. I'll allow it.

Let me write the final code.
