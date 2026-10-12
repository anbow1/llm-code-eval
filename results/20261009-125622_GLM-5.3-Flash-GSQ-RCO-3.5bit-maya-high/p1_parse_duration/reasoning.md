Implement a regex-based parser. Full match of pattern `(?:(\d+)d)?...` — but need to allow spaces between parts. Pattern: parts separated by optional whitespace between them. Build regex:

`\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*` with fullmatch. But empty string would match. Need at least one part. Check: capture groups; if all None -> ValueError. Also must ensure the whole string consumed — fullmatch handles. Note "1h 30m": `\s*(?:(\d+)h)?\s*(?:(\d+)m)?` works. But also "1 h"? That's number without unit adjacent... "1 h" — regex: (\d+)d fails, \s* then (\d+)h? needs digits immediately then h; "1 h" — after \s* consumes nothing, "1 h" doesn't match (\d+)h. Then \s* consumes nothing at "1 h"... hmm fullmatch fails, good. But wait: `\s*(?:(\d+)h)?\s*...` at "1 h": first \s* matches empty, d-part empty, \s* empty, h-part: "1 h" — (\d+) matches "1", then needs "h" but gets " " — fails, optional so empty; then \s* matches empty, m-part: "1 h" fails similarly... all fail, end: fullmatch fails since "1 h" remains. Good.

But "12" (number without unit): all optional parts fail... Actually (\d+)s? at "12": (\d+) matches "12" then needs "s" fails → part empty. Nothing matched → fullmatch fails. Good.

Edge: "1d 2d" repeated — regex allows d twice? fullmatch: first d-part matches "1d", \s*, then h-part empty... next d-part slot doesn't exist — pattern only has one d slot. So "1d 2d" fails. Good.

"1h2d": order wrong — fails. Good.

Also ensure non-empty overall: check that at least one group matched. Also "d" alone: fails. "+1s": \d+ doesn't match "+", fails. "1.5s": fails. "1S": fails.

Wait, subtlety: `\s*(?:(\d+)d)?\s*` — "1d1d" fails since only one d slot. "1d s"? fails (no number). Good.

One more: could regex match "1s" with s-part? \s* empty, d empty, \s* empty, h empty, \s* empty, m empty, \s* empty, s: "1s" → 1. Good.