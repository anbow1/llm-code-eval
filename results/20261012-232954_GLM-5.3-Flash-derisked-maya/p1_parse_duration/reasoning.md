Write a regex-based parser: pattern for a part is `(\d+)([dhms])`, full match with spaces allowed between parts.

Regex: `^(?:(\d+)([dhms]))(?:\s+(?:(\d+)([dhms])))*$` — but need to enforce order and each unit at most once. Easier: use findall on parts separated by whitespace, then validate.

Approach: strip, split on whitespace into tokens. Each token must be one or more parts concatenated. Use re.fullmatch on whole string: `^\s*(?:(\d+)([dhms])(?:\s*(\d+)([dhms]))*)\s*$` — variable groups awkward. Better: token-wise parse with regex fullmatch per token: pattern `(\d+)([dhms])` repeated — use `re.fullmatch(r'(?:\d+[dhms])+', token)` then finditer to extract pairs, check order.

Check order: units strictly in order d>h>m>s and each once. So sequence of unit indices must be strictly increasing.

Also `\d+` — no signs/decimals allowed since regex only digits. "01s" fine? Non-negative integer with leading zeros — presumably fine.

Edge: "1h 30m" — tokens ["1h","30m"], sequence h, m — increasing across tokens? The order must hold across the whole string. E.g. "30m 1h" invalid (wrong order). So track globally.