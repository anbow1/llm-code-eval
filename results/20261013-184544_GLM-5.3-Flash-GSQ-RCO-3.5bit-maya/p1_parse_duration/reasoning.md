Implement a regex-based parser. Full match regex: `^(?:\s*(\d+)d)?...` — simpler: parse with regex `^\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$` but that would allow empty string and number without unit like "123" — actually "123" would match with all groups None... but then total is 0 and it's invalid since there must be at least one part and no trailing number. The regex `(?:\s*(\d+)d)?` etc. — "123" would fail? Let's check: pattern `^\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*$`. Input "123": try to match — after optional groups, need to consume "123". Each group requires unit char. `\s*` matches empty, optional groups skip, final `\s*$` — "123" remains, fail. Good. Empty string: all optional groups skip, `\s*$` matches → match! So need to check at least one group is not None. Also need to ensure no leftover digits — regex ensures full match. But "12x34"? fails. "1d 2d" — repeated: regex would match "1d" for d, then " 2" — second d can't match since d group already done; " 2d" remains → fail. Good, order enforced by regex structure naturally. Signs: "+1h" fails regex. Decimals fail.

Edge: "1h 30m" works. "1h30m" works. Leading/trailing whitespace via `\s*`.

Also "0" alone fails, good. "  " blank fails (regex matches but no group set → ValueError).

Also must ensure non-negative integer: `\d+` fine. Large ints fine.

Write code.