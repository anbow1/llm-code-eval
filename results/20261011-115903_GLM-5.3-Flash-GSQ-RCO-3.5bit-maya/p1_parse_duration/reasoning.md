Regex-based parse: pattern `^(?:(\d+)d)?...$` with optional parts. But parts may be separated by spaces between parts. Also leading/trailing whitespace. Within a part, no spaces.

Pattern: `\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*` — but this would match empty string. Also "45" alone would... no, `\d+` requires unit. "1h30" — 30 without unit would not match since the regex requires s after? The m group is `(\d+)m`, so "30" wouldn't match anything, leaving "1h30" unmatched → fail. But empty string matches all-optional. Need to ensure at least one part present and full match.

Careful: "1d4s" — d then s, skip h,m — fine. Order enforcement: regex naturally enforces order. Repeated units: "1h1h" — after h matched, second h... `(?:(\d+)h)?` could match again? After first h, next optional group is m — "1h" fails to match `(\d+)m`, then s fails, then trailing `\s*$` fails since "1h" remains. So full-match fails. Good.

But "1h 1h"? Same. Good.

"12" alone: d fails, h fails... no match, leftover, fail. Good.

Edge: "1h 30m" with space between — handled by `\s*` between parts. But spaces are also allowed between parts of "1d4s"? Rules say parts may be separated by one or more spaces. "1 d"? That's number then unit separated — invalid. Regex `\s*(?:(\d+)d)?` — "1 d": after leading `\s*`, try `(\d+)d` on "1 d" — "1" then needs 'd', but there's space → fail. All optional → then `\s*$` fails since "1 d" remains. Good.

However, "1 h" where the space is between... covered.

One issue: could regex match partial weird strings like "1d 2d"? Repeated d — after d matched, optional h, m, s fail on "2d", trailing `\s*$` fails. Good.

Also must reject strings like "1hh"? "1h" matched, then leftover "h" → fail.

Use `re.fullmatch` on stripped string. Empty/whitespace-only: stripped empty → raise. Actually regex all-optional would match empty string, so check explicitly.

Implement:

```python
import re

_PARTS = re.compile(r"(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?")

def parse_duration(s: str) -> int:
    stripped = s.strip()
    m = re.fullmatch(_PARTS, stripped)
    if not m or stripped == "":
        raise ValueError(...)
    d, h, mi, sec = (int(g) if g else 0 for g in m.groups())
    return d*86400 + h*3600 + mi*60 + sec
```

Wait: does stripped == "" match fullmatch? Yes, all optional groups None. Explicit check handles it.

But careful: could regex match a non-empty prefix... fullmatch requires whole string. What about "1d extra"? leftover fails.

What about "1d5"? After d, m group `(\d+)m` — "5" needs 'm' after → fail; s fails; trailing `\s*$` fails since "5" remains. Good.

What about weird case "1m 2"? fails. "0d"? valid → 0.

Also `\s*` between groups — but within stripped string internal whitespace; since we stripped, trailing `\s*` handles nothing extra. Actually the regex's internal `\s*` separators plus `\s` matching—fine. But what about "1d  2h"? multiple spaces allowed — `\s*` handles.

One subtlety: could the regex with `\s*` allow "1d 2 h"? "2" then `\s*` then h? Order: after d matched, `\s*` matches space, then `(\d+)h` matches "2h". Good. But what about "1 d2h"? "1" then space → d fails... all optional fail, trailing fails. Good.

But subtle: "1d2 h"? after "1d", `(\d+)h` needs digits immediately: "2" then " h" — 'h' not right after. Fail. Good.

What about "1d 2h3"? leftover "3" fails. Good.

Hmm, one more: `\s*` between groups — could "1d" then `\s*` then... what about string "  1h30m  " — we strip. Fine.

Potential trap: "1s1d"? Order violated: s matched first? Regex tries d first: `(\d+)d` on "1s1d" — "1" then 's' not d → fail. h, m fail. `(\d+)s` matches "1s". Then leftover "1d" → trailing fails. Good.

Another: does `\s` include other whitespace like tabs? Rules say spaces; tabs between parts — "other separators" raise ValueError. `\s*` would accept tabs/newlines. Use `[ ]*` or `[ \t\n...]`? To be strict, use `[ ]+`? Actually "separated by one or more spaces" — use literal space: `[ ]*`. But then "1h  30m" — two spaces, fine with `*`. Use `[ ]*` between parts and for strip... strip() removes all whitespace including tabs — "  \t1h\t" stripped = "1h" valid. That's fine (leading/trailing whitespace allowed, presumably any). Internal tabs rejected with `[ ]*`. Good, stricter.

Write final code.