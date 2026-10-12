Implement a regex-based parser. Full match regex: `^(?:\s*(\d+)d)?...` — simpler: pattern `^(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$` but need at least one part. Also must ensure no wrong order — regex enforces order. Repeated unit impossible with regex since each group appears once... but "1m1m" — regex full match: after matching "1m", remaining "1m" would fail since m part already consumed... Actually `^(?:(\d+)m)?(?:(\d+)s)?$` on "1m1m": matches "1m" then expects optional s, fails at "1m". Good.

But decimals/signs/uppercase fail due to \d+ and lowercase literals. Empty string: regex with all optionals matches empty — need to require at least one part: check total length or require that at least one group matched. Use a check: if string stripped empty → error; and if all groups None → error. Also "1d4s" — regex `^(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$` with fullmatch works.

Edge: "1h 30m" — space between parts handled by \s*. "1 h" fails fullmatch ("1 h": (\d+)d? ... "1" then space then "h" — h group requires digits before h; the space is consumed by \s*, then "h" can't match since h group needs \d+ h. Actually pattern `(?:(\d+)d)?\s*(?:(\d+)h)?...` — "1 h": d optional fails (no d), then \s* consumes nothing, h group: (\d+)h needs digit first, "1" then \s*? No — \s* is before h group. Sequence: optional d fails, \s* matches empty, optional h: needs digit+h at pos 0: "1 h" — digit 1 matches, then need 'h' but next is space → fail, so h group empty, then \s* empty, m fails, s fails, then need $ but pos 0 → fail. Good.

"45s": fine. "1d4s": d matches, \s*, h empty, m empty, \s*, s matches 4s. Good.

Also need each unit at most once — regex handles. But what about "1s1s"? s group matches once, then leftover fails $. Good.

Numbers: \d+ matches digits; "007" fine. Leading zeros allowed presumably.

Code:

import re

_PATTERN = re.compile(r'^(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$')

def parse_duration(s):
    m = _PATTERN.fullmatch(s)
    if not m:
        raise ValueError(...)
    d, h, mi, sec = m.groups()
    if d is None and h is None and mi is None and sec is None:
        raise ValueError
    total = 0
    for val, mult in ((d,86400),(h,3600),(mi,60),(sec,1)):
        if val is not None:
            total += int(val)*mult
    return total

Wait — one subtlety: "wrong order" like "1h1d" — regex: h group matches "1h", then \s*, then d group? Pattern order is d, h, m, s — after h consumed, remaining "1d": d group comes first in pattern but position is after h... pattern is `(?:(\d+)d)?\s*(?:(\d+)h)?...` — the d group is attempted first at position 0: "1h1d" — d group needs digit+d: "1h" digit 1 then need 'd', got 'h' → fail. h group matches "1h". Then remaining "1d": \s* empty, m group fails, s group fails, then $ fails since "1d" remains. Good, raises.

But "1m2d": m group? d group first fails at "1m". h fails. m matches "1m". Then "2d": \s*, s group needs digit+s: 2 then 'd' ≠ s → fail. $ fails. Good.

One more: "\d+" could match digits with unicode? \d matches unicode digits like '١'. Probably fine; could use re.ASCII flag to be strict. Use flags=re.ASCII.

Also "1s " trailing whitespace: \s* before $ — my pattern has \s* only between parts, not trailing. Add trailing \s*: end with `\s*$`. And leading whitespace: leading \s* too. Actually simpler: `^\s*(?:...\s*){...}$`? Let me put \s* at start and end: `^\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$`. Leading/trailing whitespace allowed. Good.

Also empty/whitespace-only → all groups None → error. Good.