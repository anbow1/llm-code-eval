Need regex-based parsing. Pattern: `^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$` but must reject empty overall and ensure something matched, and reject strings like "5" (number without unit) — regex would fail since "5" doesn't match. But need to reject empty string: check s.strip() non-empty and match against full pattern. Also need to ensure spaces only between parts — pattern with optional spaces? Actually "1h 30m" — with regex above, spaces break matching. Simpler: find all tokens via regex `\d+[dhms]` and validate order/uniqueness, then ensure remaining stripped content is empty. But "1h30 m" would leave "m"? Tokens: "1h30" isn't a token... re.findall(r'\d+[dhms]', "1h30 m") gives ["1h"], remainder check: remove tokens and whitespace -> "30 m"? Hmm removing tokens: "1h30 m" -> " m"? Actually "1h" removed leaves "30 m"; strip whitespace -> "30 m" non-empty -> error. Good.

But also need "30" alone: tokens none... wait "30" — findall gives nothing? `\d+[dhms]` requires unit, so no tokens; remainder "30" non-empty -> error. Good.

Order check: track seen units, ensure strictly increasing order d<h<m<s and not repeated.

Edge: "1d4s" ok. "1s2d" -> tokens 1s,2d; order violated -> error.

Empty string: s.strip()=="" -> error.

Also things like "1h30m " trailing whitespace ok. "1h,30m" remainder ",30m"? tokens ["1h"]... wait "1h,30m": findall gives ["1h","30m"], remainder "," -> error. Good.

What about "1h  30m" multiple spaces — allowed ("one or more spaces").

Leading zeros fine. Very large ints fine.

Write code.