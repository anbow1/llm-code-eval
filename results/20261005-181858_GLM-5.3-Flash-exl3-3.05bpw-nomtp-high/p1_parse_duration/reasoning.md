Parse with regex, validate order and uniqueness.

Approach: strip, split on whitespace, concatenate parts? "1h 30m" -> concatenated becomes "1h30m". Also need to check separators: separators must be spaces only? "other separators" like "1h-30m" invalid. Also "1h,30m". Simplest: split on whitespace → tokens. Each token must match a sequence of parts. Then validate combined sequence: units strictly decreasing order, each at most once.

Token regex: `^(?:\d+[dhms])+$`. Then parse each part with `\d+([dhms])` per token, collecting in order. Ensure strict ordering: d<h<m<s, each unit at most once — combined across tokens.

Leading zeros like "01h" — non-negative integer, allowed presumably. "0d" allowed.

Empty/blank → ValueError naturally.

Missing number like "1hm" → token fails regex. "1d s" → token "s" fails. Good.

"1h30m 45s" — multiple tokens each with parts — units order across tokens must increase. Use regex to findall parts per token.

Units rank: d=4,h=3,m=2,s=1 (decreasing required).