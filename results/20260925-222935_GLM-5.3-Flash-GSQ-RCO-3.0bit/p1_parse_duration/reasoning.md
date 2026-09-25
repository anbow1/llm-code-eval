Write a parser with regex: `^\s*((\d+)(d)\s*(?=[1-9dhms...])?)...` Simplest: tokenize with regex `\d+[dhms]`, ensure entire string matches pattern of optional parts in order d,h,m,s each at most once, separated by spaces.

Regex: `^\s+(?:(\d+)d)?...` Let's construct:

`^\s*(?:(\d+)d)(?:\s*(\d+)h)?...` — but "1d4s" with no space. Also "1d 4s". Spaces allowed between parts.

Pattern: `\s*(?:1(\d+)d)?\s*(?:2...` Build:

```
r'^\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$'
```

But this would match empty string (all optional) — need at least one part. Also "1d2d" would fail because second d not matched — after matching `(\d+)d`, next optional is h... "1d2d": matches d part, then h optional fails (2d doesn't start with digit+h? "2d" — h regex `(\d+)h` requires h after digits; "2d" no), m fails, s fails, then `\s*$` fails at "2d". Good. But wait, could regex backtrack? The first `(\d+)d` could match differently? Digits are greedy but `\d+` must be followed by 'd'. For "1d2d", only one way. Fine.

Also "12" alone: number without unit — all parts fail... after `\s*` consumed? Actually `\s*` before first part matches empty, then `(\d+)d` fails since 'd' needed... regex tries: `(?:(\d+)d)?` optional — tries to match "12d"? no. So skips. Then `\s*` matches empty, h fails, etc., `\s*$` fails at "12". Good, ValueError.

But "1d 2" trailing number: fails similarly. "1 d" — space between number and unit: `(\d+)d` requires no space, fails; then `\s*` could consume "1"? No—`(\d+)d` group must match at position 0: "1 d" — `\d+` matches "1", then needs 'd' but gets ' '. Fail. So whole match fails... but wait, `\s*` at start matches empty, optional d part fails, then next `\s*` matches empty, optional h fails... eventually `\s*$` must match from position 0 but string is "1 d" — fails. Good.

But subtle: "1d x"? fails. "1h 30s": matches h, then `\s*` matches " ", s part "30s" matches, `\s*$`. Good.

Edge: empty string → all optional match, `\s*$` matches empty → succeeds incorrectly. Need to require at least one part. Use lookahead or require: pattern `^\s*(?=\S)(?:...`. Add `(?=\d)` requiring at least a digit? But what about requiring at least one part present: `(?=(?:\d+[dhms]))`? Actually require the whole string to have at least one part: use `(?=\s*\d)`? Hmm, simpler: after matching, check that at least one group is not None. But regex with all-optional and `$` could match partial? Consider "1d2": d matches "1d", then `\s*`, h fails, m fails, s fails, `\s*$` fails at "2". Backtrack: d part optional skip → then from start `\s*$` fails. Good.

But tricky case: "1d 2h 3" — fails correctly.

Case "1d2m" fine. Case "1s2" fails.

What about " 90m " fine.

Another subtlety: could regex match a prefix and stop early leaving unmatched tail? `$` anchors end, so no. But backtracking with `\d+` greedy: "1d" — `\d+` = "1". OK.

What about "01d"? `\d+` matches "01" — valid non-negative integer? Leading zeros... rule says non-negative integer; "01d" — probably fine, ambiguous. "0d" valid. I'll allow leading zeros.

What about "1d " trailing space — allowed (trailing whitespace allowed).

Potential regex trap: "1d1d" — d matches "1d", then optional h: `(\d+)h` at "1d" fails; m fails; s fails; `\s*$` fails. Backtrack: skip d optional? Then all optional skipped, `\s*$` from start fails since "1d1d" remains. So fails. Good.

But "1d2s3m"? Order wrong: after d, m fails before s? s matches "2s", then m: "3m" — after s part, next optional is... pattern order: after s there's `\s*$`. So "3m" remains → fail. Good, but wait: after d matched, `\s*` empty, h optional fails, m optional fails, s matches "2s", `\s*$` fails at "3m". Backtrack s skip → m fails... all fail, `$` fails. Good.

Hmm, but consider "2m1h": m matches "2m", then `\s*`, s fails, `$` fails at "1h". Backtrack: skip m... from start, d fails, h... wait pattern starts with d optional. "2m1h": d fails, h fails (needs h right after digits... "2m" no), m matches "2m", then s fails, `$` fails. Backtracking m skip: h fails again... eventually fail. Good.

One more: "1h 30m" — h matches, `\s*` matches " ", m matches "30m", `$`. Good.

But "1h30m " trailing: fine.

What about "1h  30m" (two spaces) fine.

What about tabs? "one or more spaces" — I'll use `\s*` which includes tabs/newlines. Might be stricter to use `[ ]*`. Rules say spaces; but leading/trailing whitespace allowed. I'll use `\s` broadly—acceptable. Actually to be safe with "other separators" rule, maybe use `[ \t]*`? Tabs could be considered whitespace. I'll use `\s*` for leading/trailing and `[ ]*`... hmm, simpler: use `\s*` everywhere. Risk: "\n1h" — leading whitespace allowed, fine. Internal newline as separator — "one or more spaces" strictly means space char. To be strict: internal separators `[ ]+`, leading/trailing `\s*`. Let's do:

```
r'^\s*(?:(\d+)d)(?:[ ]+(?:(\d+)h))?...' 
```

Hmm complicated. Alternative approach: manual parsing.

Manual approach: strip. If empty → ValueError. Use regex `re.fullmatch` on tokenized? Let's do manual:

```python
import re

_UNITS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
_PART = re.compile(r'(\d+)([dhms])')

def parse_duration(s: str) -> int:
    if not s.strip():
        raise ValueError(...)
    # fullmatch pattern
    m = re.fullmatch(r'\s*(?:(\d+)d)?(?:\s*(\d+)h)?(?:\s*(\d+)m)?(?:\s*(\d+)s)?\s*', s)
```

Problem: internal separator must be one or more spaces; `\s*` allows zero, which is fine ("1h30m"), but also allows "\n" which maybe shouldn't. Also `\s*(\d+)h` with `\s*` allows zero spaces — needed for "1h30m". If I restrict internal to spaces only, then "1d\t2h" rejected. Strictness: rules say "other separators" raise ValueError. A tab is arguably another separator. Let's be strict: internal separators are one or more spaces only; leading/trailing whitespace any.

Pattern:
`^\s*(?:(\d+)d)?(?:[ ]+(\d+)h)?...` — but this fails "1h30m" because between h and m we need optional `[ ]+`. Hmm: `(?:[ ]+...)?` requires at least one space when present, but absent entirely — "1h30m": after h part, `[ ]+` optional group: `(?:[ ]+(\d+)m)?` — tries to match "30m": `[ ]+` needs a space, fails → skip group; then s optional fails, `\s*$` fails at "30m". Bad!

So need `(?:[ ]*...)?` with zero-or-more when present... `(?:[ ]*(\d+)m)?` — then "1h2d"? after h, m group: `[ ]*` empty, `(\d+)m` at "2d" fails → skip; s fails; `$` fails. OK. But "1h 2": m group: `[ ]*` matches " ", `(\d+)m` fails at "2" → skip group entirely (backtrack `[ ]*` to empty, `(\d+)m` at " 2" fails) → skip; s fails; `$` fails at " 2"... wait after skipping, `\s*$` — `\s*` can match the space " " then `$` fails at "2". Then backtrack more... all fail → ValueError. Good.

But problem: `[ ]*(\d+)m` — with `[ ]*`, "1h2 m"? After h: m group: `[ ]*` empty at "2 m"? `(\d+)m` matches "2" then needs 'm' but gets ' '. Fail; `[ ]*` can't extend past "2". Skip m group. s group fails. `\s*$`: at "2 m" fails. Good.

However "1h2s" where order wrong... covered.

But wait — with `[ ]*(\d+)m` optional, consider "1d 2m3s" fine. Consider "1d2 m": after d: m group at "2 m": `\d+`="2", needs 'm', gets ' '. fail... skip; s: `\d+s` fails; `$` fails. But wait — could d part backtrack? `\d+` matched "1", then 'd'. No alternative. Good.

Hmm, but there's a subtle failure: "1d 2h" with `[ ]+`? I used `[ ]*` for all internal separators. But then "1d\n2h" — `[ ]*` can't match "\n"... Actually `[ ]` matches only space char. "\n" not matched, so m group: `[ ]*` matches empty at "\n2h"? `(\d+)m` fails. Skip. s fails. `\s*$`: `\s*` can match "\n" then `$` fails at "2h". Backtrack `\s*` empty, `$` fails. ValueError. Good — strict.

But also: does `[ ]*` allow zero spaces between parts when needed? "1h30m": after h part at "30m": m group: `[ ]*` empty, `(\d+)m` = "30m". 

Now the empty-string problem: all groups optional → matches "". And "   " (whitespace only) matches. Need to reject. Also need to reject strings that are fully consumed but contain zero parts? If regex fullmatch succeeds, all characters consumed by the structure; parts are the only non-space content, so if any non-space char existed, at least one part matched. Actually if fullmatch succeeded and string non-empty after strip... hmm, if fullmatch succeeds, the string consists only of matched parts and whitespace. Any part matched implies non-blank. If string is blank (only whitespace), zero parts matched. So: check `s.strip()` non-empty and fullmatch succeeds. But wait — could fullmatch succeed on a blank string via... yes trivially. So condition: `if not s.strip(): raise`. And also verify at least one group non-None? If fullmatch succeeds and s.strip() non-empty, then some part must have matched since only parts can consume non-space digits/letters. Actually could `\s*` at start consume "1"? No, `\s` doesn't match digits. So yes, safe.

But another subtle regex issue: catastrophic backtracking? Pattern is simple, fine.

One more check: "1d 1d" — d matches "1d"; h: `[ ]*` matches " ", `(\d+)h` fails → skip (also try `[ ]*` empty, `(\d+)h` at " 1d" fails); m similar fails; s fails; `\s*$` fails at " 1d"... backtrack `\s*` empty → fail. ValueError. Good.

Wait, actually there's an issue with the h group: `(?:[ ]*(\d+)h)?` — for "1d 1d", could h match? no. Fine.

What about "1h1s" — valid? Units in order d,h,m,s, subset allowed: h then s — yes valid ("1h1s"). Pattern: h matches, m: `[ ]*` empty, `(\d+)m` fails at "1s" → skip; s matches "1s"; `$`. Good.

What about "45s": d fails, h fails, m fails, s matches. Good.

What about "1d4s": d matches, then h fails at "4s", m fails, s matches "4s". Good.

Now "10" — fails. "-" sign: fails. "1.5h": `\d+` matches "1", needs 'h' but '.', fail; skip; ... `$` fails. Good.

Uppercase "1H": fails.

What about "1hh"? d fails, h: `(\d+)h` matches "1h", then m group at "h": fails, s fails, `$` fails at "h". Backtrack: h group's `\d+`... "1" then 'h'; no alt. Skip h group entirely → from start `$` fails. Good.

Hmm wait, actually there's a backtracking concern: `(\d+)h` for "1hh" — `\d+` greedy "1", then 'h' matched, remainder "h". Fine.

What about "1h2h"? h matches "1h", then m: `[ ]*` empty, `(\d+)m` at "2h" fails → skip; s fails; `$` fails. Backtrack: skip h → `$` fails. Good.

Edge: "0" alone: fails (number without unit). "0d" → 0.

Also need: what about "1d 2h 3m 4s" — good.

What about multiple spaces "1h  30m": `[ ]*` matches two spaces. Allowed ("one or more spaces"). Good.

Now also handle: fullmatch with pattern using `$` — in Python `re.fullmatch` handles anchoring; use fullmatch and drop `$`.

But there's a subtle bug: `\s*(?:(\d+)d)?(?:[ ]*(\d+)h)?...` — for input "1d " (trailing space): d matches, then h group: `[ ]*` matches " ", `(\d+)h` fails; skip; ... `\s*$` matches " ". Good.

Input " 1d": leading `\s*` matches " ", d matches. Good.

Input "\t1h": leading `\s*` matches "\t". Good — leading whitespace any.

But internal tab "1h\t30m": after h: m group: `[ ]*` fails at "\t" (zero-width ok), `(\d+)m` fails at "\t". Skip. s fails. `\s*$`: matches "\t30m"? No — `\s*` matches "\t", then `$` at "30m" fails; backtrack... fail. ValueError. Strict. Good.

Hmm — but is that desired? "one or more spaces" — yes tab should be rejected as "other separator". OK.

Wait, one more subtlety: `(?:[ ]*(\d+)h)?` — when the group is skipped vs matched with zero spaces. Consider "1d2h": d matches, h group: `[ ]*` empty, `(\d+)h` = "2h". Good.

Now, potential issue: for input "2", could the regex find some match via fullmatch? fullmatch requires entire string match. "2": d group fails, h fails, m fails, s fails, `\s*` matches empty, but then fullmatch needs end — remaining "2" unconsumed → fail. Good.

Now compute: sum unit_value * int(num) for each non-None group.

Also should we reject numbers with leading '+'/'-'? Regex `\d+` won't match sign — "+1h": `\d+` fails at '+'... fullmatch fails. Good.

Now write code:

```python
import re

_UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
_PATTERN = re.compile(
    r'\s*(?:(\d+)d)?(?:[ ]*(\d+)h)?(?:[ ]*(\d+)m)?(?:[ ]*(\d+)s)?\s*'
)

def parse_duration(s: str) -> int:
    if not isinstance(s, str) or not s.strip():
        raise ValueError("empty or blank duration string")
    m = _PATTERN.fullmatch(s)
    if m is None:
        raise ValueError(f"invalid duration string: {s!r}")
    d, h, mi, sec = m.groups()
    total = 0
    for num, unit_secs in ((d, 86400), (h, 3600), (mi, 60), (sec, 1)):
        if num is not None:
            total += int(num) * unit_secs
    return total
```

Wait — but there's a flaw: the regex with all-optional groups and trailing `\s*` — could fullmatch succeed while a part matched but there's leftover garbage that got consumed... no, fullmatch consumes everything; only parts + whitespace can be consumed. So if any non-whitespace char exists, a part consumed it, meaning part matched correctly. But careful: could `\s*` at end consume digits? No.

But another flaw: what about a string like "1d" but with the h group matching "d..."? no.

Hmm, wait — one real flaw: the m group `(?:[ ]*(\d+)m)?` for input "1h30m" — good. But consider "1h 30m x"? fails. Good.

Now, is there a case where regex succeeds but shouldn't? Consider "1d 2m 3" — no. Consider "12m34" — m matches "12m", s: `[ ]*` empty, `(\d+)s` at "34" fails → skip; `\s*$` fails. Good.

Consider "1d 2h3m4s" — good.

Consider "  " blank — caught by strip check.

Consider "1d1s" — d matches; s: `[ ]*` empty, matches "1s". h, m skipped. Order d then s valid. Good → 86401.

Hmm, "1d1s": wait pattern after d: h group `(?:[ ]*(\d+)h)?` at "1s": fails, skip. m: fails, skip. s: `(\d+)s` = "1s". Good.

Now one more potential problem: the regex engine might match parts out of intended association. E.g., "5d5d"? covered. "5d5" covered.

What about "1d 2h" where between d and h exactly one space — `[ ]*` matches. Two spaces fine. What about "1d2h" zero spaces fine.

Edge: "1d 2h" — good. What about "1d2h " trailing — `\s*` end.

Edge: "1d 2h " good.

What about "1d2h3m4s" all — good.

What about string with only spaces inside like "1d 2h" vs "1d  2h" both fine.

Hmm, is there a case where `[ ]*` + optional causes the h group to "swallow" incorrectly? E.g., "1d 2h" — could d group match differently? `\d+` greedy: "1", 'd' matches. Then remainder " 2h". Fine.

What about "10d" — `\d+` = "10". Good.

What about "1e5"? fails.

I think this is solid. One more consideration: should "01d" be valid? int("01") = 1. Rules say non-negative integer — ambiguous; accept.

Also what about extremely large numbers — fine.

Should I also reject strings like "1d " vs... fine.

Double-check the strip check handles e.g. "\u00a0" (non-breaking space)? `\s` in Python matches Unicode whitespace including \xa0? Actually `\s` with str patterns matches Unicode whitespace, and '\xa0' is whitespace per Unicode. `str.strip()` also strips it. Fine either way.

But hmm — internal separator using `[ ]` only matches ASCII space. Unicode spaces like '\u3000' internally would be rejected. Fine, strict.

Wait, actually reconsider: is rejecting internal tab/newline desired? Rules: "separated by one or more spaces". Yes, spaces only. Strict is correct.

One more: what about "1h 30m" — between h and m: `[ ]*` matches " ". Good. But what about "1h30m" — zero. Good.

What about "1d 2h 3m 4s" full. Good.

Also what about a string like "1d 2h" but the regex's first `\s*` at start consumes leading whitespace — good.

Potential subtle bug: the leading `\s*` is greedy; for " 1d": consumes " ". Good.

Now, could the pattern match "1d 2h3m" where after h: m group: `[ ]*` empty, "3m" matches. Good.

Also "1d2h 3m": m group: `[ ]*` matches " ", "3m". Good.

Now, one thing: the final `\s*` — for "1d 2h 3m 4s " trailing space consumed. Good.

What about "1s " — good.

I'm fairly confident. Also handle None group check not needed since strip check ensures at least one part... but actually let me double check: string "1d" — could fullmatch succeed with zero parts? No, "1d" has non-space chars that must be consumed by a part. The only consumers of non-space chars are the four optional part groups and... `\s*` groups can't. So yes.

Actually wait: is it possible that fullmatch succeeds but a "part" matched with a wrong unit while another group matched the rest incorrectly? E.g., "1d" could be matched by... only d group can match "1d" (h group needs 'h'). So groups map correctly to units by construction. Good.

Edge case: what if input has a part like "1d" but the d group is skipped and h group matches "1d"? Impossible ('d' ≠ 'h').

Return type int. Done.

Let me also consider: should the function reject "1d 2d" — yes shown. "2d1d": d matches "2d", h fails, m fails, s fails, `$` fails at "1d". Good.

One more tricky: "1m2s1h"? m matches "1m", s matches "2s", then `$` fails at "1h". Backtrack s skip → `$` fails... m skip → h? At start: d fails, h fails? "1m" — `(\d+)h` needs 'h'. fails. Eventually fail. Good — order enforced.

Wait, actually careful: "1m2s1h" — after m matched, s matched "2s", remaining "1h" — `$` fails. Backtrack: s group skip → `$` at "2s1h" fails. m group skip → then s group at start: `(\d+)s` fails at "1m". `$` fails. d, h fail. Overall fail. Good.

Now "1h2s" valid? h then s: yes subset in order. Good.

"2s1h": s matches "2s", `$` fails at "1h"; backtrack s skip: d, h... h group `(?:[ ]*(\d+)h)?` at "2s": fails; m fails; `$` fails. Good.

Alright. Also, "d" alone (unit without number): d group needs `\d+` first — fails. All groups fail, `$` fails at "d". Good.

"s1h"? s fails... all fail. Good.

Now finalize code. Also raise ValueError with message. No printing/tests.

One more thought on the regex: use raw string; compile once. Use `re.fullmatch`.

Also should I guard non-string input? Type hint says str; but defensive isinstance check ok. I'll include it (raising ValueError or TypeError?). Rules say "Anything else raises ValueError" referring to string contents. I'll just handle str; if not str, raise ValueError too (or TypeError). I'll raise ValueError to be safe? Actually passing non-str... I'll do `if not s.strip()` — if s is not str, `.strip` may fail with AttributeError. Keep isinstance check raising ValueError. Fine.

Final code.