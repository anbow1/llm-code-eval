Write a regex-based parser. Pattern: full match `^(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?$` with anchors, but need to enforce order and each at most once — regex handles order naturally since groups are in order. But must ensure at least one part present, and no extra separators between parts beyond spaces. Also need to reject e.g. "1d 2h 3d" — regex with each group once would fail because "3d" can't match d group twice... Actually full match with `(\d+d)?` only once: "1d 2h 3d" — after matching 1d, 2h, then 3d would need to match... nothing left; fails. Good.

Edge: "1d h" — h without number fails. " 45s " fine with strip or regex with optional whitespace. Use `\s*` between parts and allow leading/trailing whitespace via strip or pattern `\s*` at ends. Let pattern be `r'\s*(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?\s*$'` with re.fullmatch. But `\d` matches Unicode digits — fine, could use [0-9] to be strict. Use [0-9].

Problem: empty string matches all-optional groups. Need to check at least one group matched. Also blank string fails. Also need each part to have number — pattern includes number required in each group. Number without unit e.g. "30" — doesn't match any group → fail. Signs: "+30" fails since [0-9]. Decimals fail.

"1d 4s" works. "1d4s" works. "45s" works.

Also need to check at least one part matched: track last matched group index. Use match, check which groups are non-None.

Also something like "1d 2h 3m 4s 5" fails. "1d  2h" (multiple spaces) fine.

Also "1h30m" — after 1h, then 30m: `\s*` then m group matches. Good.

Order enforced: "1h 2d" — after 1h, 2d can't match h group again (needs number+h; "2d" is number+d, doesn't match `\d+h`). Then m? no, s? no, trailing `\s*` then end, but "2d" remains → fail. Good.

Repeated: "2m 3m": after 2m, 3m must match s group? `\d+s` — "3m" doesn't match. Fail. Good. But "3m2s..." fine.

Uppercase: fails. Unknown unit: fails.

Edge: "1d " trailing — ok. What about "1s2d"? after 1s, 2d can't match anything → fail. Good.

One subtle: pattern `\s*(\d+d)?...` — could a string like "  1d  " match? yes.

What about a string matching with zero parts like "   " — match succeeds with all None → need to raise. Check: sum of matched groups == 0 → ValueError.

Also `re.fullmatch` with pattern; note `\s*` at start: leading whitespace allowed. But also need to guard: what if string contains only spaces between... covered.

Implement:

import re
_PATTERN = re.compile(r'\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*\Z')

Wait, `\d+` for number — but "number" is "non-negative integer". Multi-digit fine. But `\d` in Python matches unicode digits like '٣'. To be safe use [0-9]+.

Also careful: group must be non-capturing with number captured inside: `(?:(1)d)?` — pattern `(?:(?P<d>[0-9]+)d)?`.

Then compute seconds with multipliers.

Also check at least one part. Also, note: regex `\s*\Z` at end — but a string like "1d x" fails.

Also potential issue: "1d2" — after 1d, then `\s*` then h? no, m? no, s? no, trailing `\s*` then end — "2" remains → fail. Good.

Another subtlety: zero numbers like "0d" valid → 0 seconds. Fine.

Also "1d 0s" fine.

But wait: could regex match a prefix incorrectly? fullmatch prevents that.

Hmm, one tricky case: "1h 30m" — with `\s*` between groups, yes.

What about "1h30 m"? after 1h, 30 then space then m: m group requires number immediately before m, no space allowed. "30 m": m group is `(?:(?P<m>[0-9]+)m)?` — "30 m" — the m group would need to match "30 m" starting right after `\s*` consumes nothing... Actually after 1h matched, `\s*` consumes " ", then m group tries `[0-9]+m` on "30 m" — matches "30" then needs "m" but finds " " → fail; m group optional → skip; s group fails; then trailing `\s*` — but "30 m" remains → fullmatch fails. Good.

Wait, but `\s*` between parts — after 1h, `\s*` consumes " ", then m group tries at "30 m": fails, skip; then... hmm, but regex backtracking: `\s*` could consume less? `\s*` consumed " " fully; m optional fails to match at "30 m" (since after digits "30" comes space, not m). Actually could m group match with `[0-9]+` = "30" then require 'm' — fails. So skip m. Then s optional fails, skip. Then trailing `\s*` matches... at position after "1h " we're at "30 m" — trailing `\s*` matches zero chars, then `\Z` requires end — fails. Backtrack: `\s*` (inner) matches zero — m group at " 30 m"? starts with space, fails. So overall fail. Correct.

Also "1d 2h 3m 4s" fine.

Also need ValueError for strings like "1d,h" etc. — fail naturally.

Also empty string: fullmatch matches with zero parts → raise.

Now also check: what about a string like "1d " with trailing spaces — matches, parts=1. Good.

But subtle: could a non-blank string match with zero parts? Pattern `\s*(?:...)?... \s*\Z` — only whitespace matches with zero parts. So the "at least one part" check equals "non-blank". But also strings like "" — blank.

Hmm, but there's an issue: the check for "at least one part matched" — if string is all whitespace, all groups None → raise. Good.

But another subtlety: could regex match something like "1d" where... fine.

Potential regex catastrophic backtracking? Pattern is linear-ish; `\s*` between optional groups — fine.

But wait: there's a subtle bug — with pattern `(?:(?P<d>[0-9]+)d)?` optional, could a string "12d" match where d group matches "12d". Yes.

What about "1d 1d"? after first 1d, `\s*` consumes " ", h fails, m fails, s fails ("1d" not `[0-9]+s`... "1d": `[0-9]+` matches "1", then 'd' needed but next is 'd'? Wait s group requires 's' literal — "1d" after digits '1' next char 'd' ≠ 's' → fail). Trailing `\s*` then `\Z` — "1d" remains → fail. Good.

Hmm wait, actually could s group match "1d"? `[0-9]+` greedy "1", then literal 's' — next is 'd', no. Could `[0-9]+` match less? Only "1". Fail. Good.

Now also there's a subtle case: "2s3m" — wrong order: after 2s matched by s group, then "3m" needs... m group already passed. Trailing fails. Good. But wait — could "2s3m" match differently? `\s*` zero, d group: `[0-9]+d` on "2s3m"? "2" then 's'≠'d' fail → skip. h: "2" then 's'≠'h' fail. m: "2" then 's'≠'m' fail. s: "2s" matches! Then `\s*` zero, then trailing `\s*` at "3m" — `\Z` fails. Backtrack s group: `[0-9]+` could match "2" only. Hmm, could d group... no. Fail overall. Good.

Hmm, but "3m2s" — m: "3m" matches, then s: "2s" matches. Good, valid.

Edge: what about number like "007d"? valid, = 7 days. Fine.

Now also enforce no space between number and unit — regex does that.

Also enforce: "Each unit at most once" — regex groups each appear once. But could a single group consume e.g. "1d" via s group? No.

Hmm, but here's a tricky one: "1d 2h" vs "1d2h" both fine. What about "1d 2h 3d"? fail as shown.

What about "1h 1m 1s 1d"? Order wrong. After h, m, s matched, "1d" remains → fail. But could regex match "1d" via... no. Good.

Now write code:

```python
import re

_PARTS_PATTERN = re.compile(
    r'\s*(?:(?P<d>[0-9]+)d)?\s*(?:(?P<h>[0-9]+)h)?'
    r'\s*(?:(?P<m>[0-9]+)m)?\s*(?:(?P<s>[0-9]+)s)?\s*'
)

def parse_duration(s: str) -> int:
    m = _PARTS_PATTERN.fullmatch(s)
    if m is None:
        raise ValueError(f"invalid duration string: {s!r}")
    parts = {u: int(v) for u, v in m.groupdict().items() if v is not None}
    if not parts:
        raise ValueError("empty duration string")
    return (parts.get('d', 0) * 86400 + parts.get('h', 0) * 3600
            + parts.get('m', 0) * 60 + parts.get('s', 0))
```

Wait — one more issue: pattern without `$`/`\Z` at end; fullmatch handles it. But `\s*` trailing — with fullmatch, trailing `\s*` must consume all remaining whitespace. Fine.

Hmm, one more edge: string like "1d\tx"? fail. "1d\n" — `\s` includes newline → valid? Trailing whitespace allowed — yes, `\n` is whitespace, fine.

Check "1d 2" — fail. "1d2" fail? After d group "1d", `\s*` zero, h: "2" then need 'h' — end of string → fail... wait `[0-9]+` matches "2" then literal 'h' needs a char — none → fail; skip. m: same fail. s: same. Trailing `\s*` at "2" — zero, then `\Z` fails. Backtrack: d group `[0-9]+` could match "1" then 'd'? next char '2'... wait d group tried at start: `[0-9]+` greedy "12"? Then need 'd' — next is nothing... hmm string "1d2": `[0-9]+` greedy matches "1" (since "d" isn't digit)... actually "1d2": digits: "1", then 'd', then '2'. `[0-9]+` matches "1", then literal 'd' matches → d group = "1d". Then continue as above, fail at "2". Backtrack d group: `[0-9]+` can't match less than "1". Then d optional skip; h group at "1d2": "1" then 'd'≠'h' fail... all fail. Overall fail. 

Also "1d 2h " fine.

One more: "0" — fail. "d" — fail (no number). "1" — fail. "1dd" — d group matches "1d", then remaining "d" fails → good. "1D" fail.

Also "1d  " with two trailing spaces — fine.

Also should we reject strings where a part has leading zeros? Not required.

I think this is solid. Also should the function reject None/non-str? Not specified.

One more consideration: the problem says "Anything else raises ValueError" — including empty or blank. Our check handles blank via `not parts`.

Also potential subtlety: pattern `\s*(?:...)` — for input "  1d  2h  " works.

What about a string like "1d 2h 3m 4s" with newlines between? `\s*` handles.

Edge case: "1h 30" — fail. "1h 30m" pass.

Also, could there be an issue with the regex matching "1d" where the d group... all good.

Another possible subtlety: the regex could match "s" group with input "2s" then trailing `\s*`. Yes.

Also input like "1d 2h 3m 4s extra" — fail.

Also: could the regex mis-parse "1d2s" — d: "1d", then `\s*` zero, h fail, m fail, s: "2s" match. Valid → 86400+2. Good ("1d4s" allowed).

Final answer.