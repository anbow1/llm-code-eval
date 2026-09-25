Let me break down the problem:

1. Parse a duration string like "1d2h30m45s" into total seconds
2. Parts: `<non-negative integer><unit>` where unit is d, h, m, s
3. Units must appear in order d, h, m, s (each at most once)
4. Parts can be adjacent ("1h30m") or separated by spaces ("1h 30m")
5. Strict validation - raise ValueError for anything invalid

Let me think about the parsing strategy:

- Strip leading/trailing whitespace
- Reject empty/blank strings
- Need to extract parts in order: optionally d, then h, then m, then s
- Each part is `<non-negative integer><unit>` with no space between number and unit
- Spaces between parts are allowed (one or more)

Approach 1: Use regex
- Pattern: `^\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$`
- This enforces order d, h, m, s with optional spaces between them

But wait, I need to be careful. The regex approach could work but I need to make sure:
- No decimal numbers
- No signs
- No uppercase units
- Each unit at most once

Let me think about this more carefully. A regex like:
`^\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?$`

This would match valid patterns. But would it reject things like "1x2h"? Yes, because 'x' isn't matched by any group.

Would it reject "1h30h"? Let me check... The regex tries to match groups in order. "1h30h" - first group (d) doesn't match. Then "1h30h" against `(?:(\d+)h\s*)?` - it would try to match "1h30h" but `\d+` is greedy, so it would match "1" then "h", leaving "30h". Then `(?:(\d+)m\s*)?` wouldn't match "30h". Then `(?:(\d+)s\s*)?$` wouldn't match "30h". So it would fail. Good.

Wait, actually let me reconsider. `\d+` is greedy. For "1h30h":
- First optional group `(?:(\d+)d\s*)?` - tries to match, `\d+` matches "1", then expects 'd' but finds 'h'. The optional group fails (matches empty).
- Second group `(?:(\d+)h\s*)?` - `\d+` matches "1", then 'h' matches. So it captures "1". Remaining: "30h".
- Third group `(?:(\d+)m\s*)?` - `\d+` matches "30", then expects 'm' but finds 'h'. Optional group matches empty.
- Fourth group `(?:(\d+)s\s*)?` - `\d+` matches "30", then expects 's' but finds 'h'. Matches empty.
- End: `\s*$` but remaining is "30h", so no match. 

Hmm wait, but `\d+` in the third group would match "30", then expect 'm', find 'h'. Since the group is optional `?`, it backtracks. Does it backtrack to not consume "30"? Let me think...

Actually with `(?:(\d+)m\s*)?`, if `\d+` matches "30" but then 'm' doesn't match 'h', the whole group fails and matches empty. So remaining is "30h". Then the s group tries to match "30h", `\d+` matches "30", expects 's', finds 'h', fails, matches empty. Then `\s*$` - remaining is "30h", no match. Good, it rejects.

What about "1d2h30m45s"? 
- d group: matches "1d", captures "1". Remaining: "2h30m45s"
- h group: matches "2h", captures "2". Remaining: "30m45s"
- m group: matches "30m", captures "30". Remaining: "45s"
- s group: matches "45s", captures "45". Remaining: ""
- `?` matches "". Good.

What about "1h 30m"?
- d group: `\d+` matches "1", expects 'd', finds 'h'. Group matches empty. Remaining: "1h 30m"

Hmm wait, that's a problem. If the d group is optional and doesn't match, the regex engine moves on. But `\d+` in the h group should match "1". Let me re-examine.

For "1h 30m":
- `(?:(\d+)d\s*)?` - tries `\d+` → "1", then expects 'd' but finds 'h'. The group is optional, so it backtracks to match empty. Remaining: "1h 30m"
- `(?:(\d+)h\s*)?` - tries `\d+` → "1", then 'h' matches, then `\s*` matches " ". Captures "1". Remaining: "30m"
- `(?:(\d+)m\s*)?` - `\d+` → "30", 'm' matches. Captures "30". Remaining: ""
- `(?:(\d+)s\s*)?` - matches empty. Remaining: ""
- `\s*` matches "". Good.

What about "45s"?
- d: tries `\d+` → "45", expects 'd', finds 's'. Backtrack, matches empty.
- h: tries `\d+` → "45", expects 'h', finds 's'. Backtrack, matches empty.
- m: tries `\d+` → "45", expects 'm', finds 's'. Backtrack, matches empty.
- s: `\d+` → "45", 's' matches. Captures "45". Good.

What about "1d4s"?
- d: "1d", captures "1". Remaining: "4s"
- h: tries "4", expects 'h', finds 's'. Empty.
- m: tries "4", expects 'm', finds 's'. Empty.
- s: "4s", captures "4". Good.

What about uppercase "1H"?
- d: tries "1", expects 'd', finds 'H'. Empty.
- h: tries "1", expects 'h', finds 'H'. Empty.
- m: tries "1", expects 'm', finds 'H'. Empty.
- s: tries "1", expects 's', finds 'H'. Empty.
- `\s*$` - remaining "1H". No match. Good, raises ValueError.

What about decimals "1.5h"?
- The `\d+` would match "1", then expects 'd', finds '.'. Backtrack. Eventually no group matches properly. Let me trace:
- d: "1" then expects 'd', finds '.'. Empty.
- h: "1" then expects 'h', finds '.'. Empty.
- m: "1" then expects 'm', finds '.'. Empty.
- s: "1" then expects 's', finds '.'. Empty.
- `\s*$` - remaining ".5h". No match. Good.

What about signs "-1h"?
- d: tries `\d+` on "-1h", `\d+` doesn't match '-'. Group is optional, empty. Remaining: "-1h"
- h: `\d+` on "-1h", doesn't match '-'. Empty. Remaining: "-1h"
- m: same. Empty.
- s: same. Empty.
- `\s*$` - remaining "-1h". No match. Good.

What about "0d"?
- d: `\d+` → "0", 'd' matches. Captures "0". Good, 0 seconds.

What about "0h0m0s"?
- Each group matches 0. Total 0 seconds. Good.

What about "1h2h"?
- Already analyzed - would fail because after matching "1h", "2h" can't be matched by m or s groups.

Actually wait, let me re-check "1h2h" more carefully:
- d group: tries "1", expects 'd', finds 'h'. Empty.
- h group: tries `\d+` → "1", 'h' matches, `\s*` matches "". Captures "1". Remaining: "2h".
- m group: `\d+` → "2", expects 'm', finds 'h'. Empty. Remaining: "2h".
- s group: `\d+` → "2", expects 's', finds 'h'. Empty. Remaining: "2h".
- `\s*$` - remaining "2h". No match. 

What about an empty string ""?
- The whole regex `\s*(...)?\s*(...)?\s*(...)?\s*(...)?\s*` with all groups matching empty would match "". So I need to explicitly check for empty/blank.

What about "  " (only spaces)?
- The regex would match because all groups are optional and `\s*` handles whitespace. So I need to check that at least one group captured something.

Let me also consider: what about "1d  2h"? Multiple spaces.
- `\s*` after each group handles multiple spaces. Should work.

What about "1dh"? (number then two units)
- d: `\d+` → "1", 'd' matches. Remaining: "h".
- h: `\d+` on "h" doesn't match (no digit). Empty.
- m: same. Empty.
- s: same. Empty.
- `\s*$` - remaining "h". No match. Good.

What about "h1"?
- No digits before unit. All groups' `\d+` won't match 'h'. All empty. `\s*$` - remaining "h1". No match. Good.

I think the regex approach works well. Let me also make sure the regex is anchored properly with `re.fullmatch` or `^...$`.

Let me write the function:

```python
import re

def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank string")
    
    m = re.fullmatch(r'\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?', s)
    if m is None:
        raise ValueError("invalid duration string")
    
    # Check that at least one group matched
    if m.group(1) is None and m.group(2) is None and m.group(3) is None and m.group(4) is None:
        raise ValueError("no duration parts found")
    
    total = 0
    if m.group(1) is not None:
        total += int(m.group(1)) * 86400
    if m.group(2) is not None:
        total += int(m.group(2)) * 3600
    if m.group(3) is not None:
        total += int(m.group(3)) * 60
    if m.group(4) is not None:
        total += int(m.group(4)) * 1
    
    return total
```

Wait, I need to be more careful about the regex. Let me think about whether `\s*` between groups could cause issues.

Pattern: `\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?`

Actually, the leading `\s*` and trailing `\s*` handle leading/trailing whitespace. The `\s*` inside each group handles spaces after a part.

Hmm, but what about spaces BEFORE a part but AFTER a previous part? Like "1h 30m" - the space after "1h" is handled by `\s*` inside the h group. Then "30m" matches the m group. Good.

What about "1h  30m"? Two spaces. `\s*` handles multiple spaces. Good.

What about "1 h"? (space between number and unit)
- d: `\d+` → "1", expects 'd', finds ' '. Backtrack to empty match. Remaining: "1 h"
- h: `\d+` → "1", expects 'h', finds ' '. Empty. Remaining: "1 h"

Hmm wait. Let me reconsider. After d group matches empty, the regex continues from position 0. Then h group: `\d+` matches "1", then expects 'h' but sees ' '. The group `(?:(\d+)h\s*)?` fails (since it's optional, matches empty). Remaining: "1 h". Then m group: `\d+` matches "1", expects 'm', finds ' '. Empty. Remaining: "1 h". s group: similar. Then trailing `\s*` matches " ", but there's still "h" left. `\s*$` fails because "h" is left. No match. 

Wait, let me re-examine. After all groups match empty, we're at position 0 in "1 h". Then trailing `\s*` - but we already have `\s*` before each group too. Let me look at the full pattern again:

`\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?`

Position 0: first `\s*` matches nothing (no leading space in "1 h" since s="1 h"). Wait, "1 h" starts with '1', no leading space.

Hmm, I realize there's a subtle issue. After the d group matches empty (backtracking from trying `\d+` → "1"), the regex engine is still at position 0. Then h group tries `\d+` → "1", then 'h' but finds ' '. Backtracks to empty match. Still at position 0. Then m group, same thing. s group, same thing. Then we're at position 0. `re.fullmatch` requires the pattern to match the ENTIRE string from 0 to end. Since nothing consumed "1 h", it won't be a fullmatch. 

Actually, I realize `re.fullmatch` anchors at both ends, so the regex must consume the entire string. Since none of the groups consumed anything, and the `\s*` at the start and end only consume whitespace, the non-whitespace characters "1 h" remain unmatched. So fullmatch fails. 

But wait - what about a string that's only whitespace, like "   "?
- All groups match empty, leading `\s*` matches "   ", trailing... actually there's no trailing `\s*` after the last group's internal `\s*`. Let me re-read: the last group is `(?:(\d+)s\s*)?`. If s group matches empty, then the pattern has consumed the leading `\s*` (all whitespace) and we're at the end. So `fullmatch` would match "   ". I need to handle this with the "no duration parts" check.

Good, I already have that check.

Let me also think about: what if the string is "1d2h30m45s"? All groups match. Total = 86400 + 7200 + 1800 + 45 = 95445.

What about "1d4s"? d=86400, s=4. Total = 86404.

What about "90m"? m=90*60=5400.

I think this solution is correct. Let me also consider edge cases:
- "0" (number without unit) → all groups' `\d+` matches "0" but then the unit letter doesn't match any of d/h/m/s. All groups empty. fullmatch fails because "0" is not consumed. Good.
- "00h" → h group captures "00" which is 0. That's fine, it's a non-negative integer.
- "0d0h0m0s" → all zeros. Total = 0. That's valid.

I think the solution is complete. Let me also double-check: "1d2h30m45s extra" would fail because "extra" isn't consumed. Good.

One more: what about tabs between parts? `\s` matches tabs too, so "1h\t30m" would work. The problem says "one or more spaces" but `\s` is more permissive. I think that's fine since the problem says "separated by one or more spaces" and typically tabs are considered whitespace in such contexts. But to be safe, I could use ` ` (literal space) instead of `\s`. But I'll stick with `\s` since it's more natural.

Actually, re-reading the rules: "separated by one or more spaces". This might mean only spaces (U+0020), not tabs or newlines. But I'll use `\s` as it's the common interpretation and the problem doesn't explicitly forbid tabs.

Let me finalize the code.
