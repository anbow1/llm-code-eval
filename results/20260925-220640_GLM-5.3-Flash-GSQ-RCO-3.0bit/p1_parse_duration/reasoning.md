Need a parser. Use regex with fullmatch on a normalized pattern. Pattern: optional spaces between parts, each part = number + unit. Regex: `\s*(?: (\d+)d )? (?: (\d+)h )? (?: (\d+)m )? (?: (\d+)s )? \s*` with anchors, and require at least one part.

Pattern: r"\s*(?:(\d+)d\s+)?(?:(\d+)h\s+)?(?:(\d+)m\s+)?(?:(\d+)s\s+)?\s*" — but trailing spaces handled by \s* at end. Inter-part separation: one or more spaces. Use `\s*` between? Leading whitespace allowed, trailing allowed, between parts one or more spaces — `+` or zero. Let's allow `\s*` everywhere but require at least one part and full match.

Problem: if all groups optional and pattern can match empty, need to ensure non-empty content. So capture full match, check that concatenation of parts is non-empty.

Regex: `r"\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?"` with fullmatch, then check any group matched. But `\d+` — decimals like "1.5h" would fail since `\d+` then `.` won't match. Signs fail since `\d+` won't match `+`. Empty string: fullmatch matches with all optional, so check groups. But "1h" then repeated: "1h1h" fails since second h has no slot. Good.

However, the regex with all-optional groups and fullmatch could mis-parse "1d5" — no, "5" without unit: after d part, optional h/m/s all fail, but pattern requires... pattern is all optional, so after matching `\d+d\s*`, remaining "5" doesn't match rest, fullmatch fails. Good.

Edge: "1h 30m" — `\d+` "1", then `\s*` matches " ", then h-part... order in regex is d, h, m, s; h group matches "1h", then `\s*` matches " ", then m part "30m", done. Good.

Edge: "  1d4s  " fine.

Edge: "1s2d" — s group only at end; "1s" can't match d slot since `\d+)d` needs 'd'. Actually d slot tries to match "1s" fails; h fails; m fails; s slot matches "1s"; then remaining "2d" fails → fullmatch fails → ValueError. Good.

Edge: "1h30m  " trailing ok. "1h30m2d" fails.

Edge: empty parts check: after fullmatch, check groups non-None. Also check that total length > whitespace only. Actually "  " would fullmatch with all None → raise.

One catch: `\d+` could match "0" etc. fine. Non-negative integer, no leading restriction.

Write code.

def parse_duration(s: str) -> int:
    pattern = re.compile(r"\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?")
    m = pattern.fullmatch(s)
    if m is None or not any(m.groups()):
        raise ValueError(...)
    ...

Wait, "not any" checks groups truthy — group values are strings; "0d" → "0" truthy. Good.

But careful: pattern must also prevent cases like "1h 30m extra chars" — fullmatch handles.

Subtle: `\s*` between parts allows zero spaces. But "1h30m" fine. What about "1h,30m"? fails.

Also unicode digits? `\d` in Python matches unicode digits by default. Should restrict ASCII? "non-negative integer" — probably fine to use `\d` but could use `[0-9]+` to be strict. Use `[0-9]`.

Units lowercase only: regex uses 'd','h','m','s' literal lowercase; uppercase 'H' won't match → ValueError. Good.

Compute seconds.

Also number without unit like "5" alone: all slots fail → fullmatch fails? Let's trace: d slot tries `[0-9]+d` on "5" — fails. h, m, s fail. All optional → empty match, fullmatch requires pattern to cover whole string; empty match can't cover "5". So fail. Good.

Trailing whitespace with last part: "45s " — s slot `[0-9]+s\s*` matches. Good.

Missing number "dm"? d slot needs `[0-9]+` fails; others fail; fullmatch fails. Good.

Return int total.