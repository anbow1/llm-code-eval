Parse with regex like `(?:(\d+)d)?...` but parts can be separated by spaces. Approach: strip string, then use regex fullmatch on pattern allowing optional spaces between parts: `^(\d+)d\s+(...)$` — tricky because "1h30m" has no space.

Simpler: remove spaces? No — spaces are allowed between parts, but must not create other issues. Approach: split by whitespace into tokens, but "1h30m" would be one token containing multiple parts. Then for each token, extract parts via regex, ensuring order across tokens.

Parse a token: regex fullmatch `(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?` but must have at least one part. Then also reject like "12" (number without unit) — regex fullmatch with all-optional would fail "12" since trailing unmatched. Fullmatch would fail "12" because (\d+) requires unit d... Actually `\d+d` requires 'd'. "12" doesn't match, good.

Better: parse each token with re.fullmatch of combined pattern, but track which units present to detect repeats and order across tokens. Also "1d 2d" repeats d across tokens — must be rejected.

Plan:
- s2 = s.strip()
- if not s2: raise ValueError
- tokens = s2.split() — but split on arbitrary whitespace; spaces "one or more" allowed between parts. Fine.
- Order tracking: last_rank = -1; seen set.
- For each token:
  - pos = 0, parse parts with re.match at position: loop matching `(\d+)([dhms])` repeatedly while pos < len. Each iteration consumes a part. At end must be pos == len(token).
  - For each part: unit determines rank. Check rank > last seen rank within... Actually rank must strictly increase across parts globally? Order d,h,m,s overall. So each subsequent part's unit rank must be strictly greater than previous part's unit rank. Also unit not seen before (equivalent). Use seen set: if unit in seen → error; if rank <= last_rank → error (covered by seen check since repeat is the only way rank decreases... e.g., "1m 2h": m then h, h not seen but rank 2 < last_rank 3? last_rank starts -1, then m → 3, then h rank 2, not seen but wrong order. So check rank > last_rank handles both).
  - Numbers: non-negative integer — "\d+" allows leading zeros "007d"? Non-negative integer, probably fine. Rules say digits; "007" is a non-negative integer written with leading zeros — ambiguous. Regex `\d+` accepts it. I'll accept.

Use re to match: `re.compile(r'(\d+)([dhms])')`. Use token scanning with match at pos.

Return total.