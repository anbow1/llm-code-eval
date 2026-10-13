Straightforward regex-based parser.

Pattern: r'\s*((\d+)d)?\s*((\d+)h)?\s*((\d+)m)?\s*((\d+)s)?\s*' — need full match and at least one part.

Careful: "1d4s" — parts separated by space or not. Regex: use fullmatch on a pattern where each part optionally preceded by whitespace? But "1h 30m" has space between; "1h30m" no space. Leading/trailing whitespace allowed. No other separators.

Pattern: r'\s*(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?\s*' with fullmatch and require at least one group matched. Also "12" alone would fail (number without unit) since optional groups — (\d+d) won't match "12", nothing matches → fullmatch succeeds with all None but string "12" — wait, fullmatch requires whole string matched. "12" — the pattern's \s* parts match empty, groups all None, but total match must cover "12". \s* matches empty strings, so the overall match covers zero length... fullmatch requires span entire string, so "12" fails. Good.

But "1x" — fails. "1d 1d" repeated — regex would fail since only one d group. Good. "1h1d" order wrong — fails. "90m" ok. Empty string: pattern fullmatches with zero-length? fullmatch on "" — the pattern can match empty, so fullmatch succeeds with all None. Need to check at least one part present. Also whitespace-only similarly. So check if any group matched; else ValueError.

Edge: "1d " trailing space fine. " 30s " fine.

Implement with re.fullmatch, groups indexed.