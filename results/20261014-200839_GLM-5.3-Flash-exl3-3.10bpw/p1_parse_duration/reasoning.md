Parse with regex per part: `(\d+)([dhms])`. Validate order, uniqueness, concatenation of consumed string must cover the stripped input except spaces between parts.

Approach: strip input; if empty raise. Tokenize: scan with regex `(?:\d+[dhms])(?: +\d+[dhms])*`? Better: use `re.fullmatch` on pattern `(\d+d)?\s*(\d+h)?\s*(\d+m)?\s*(\d+s)?` with fullmatch ensuring full consumption. But `\d+m` vs `\d+s` careful: e.g. "30m" fullmatch `(\d+m)?` fine. Pattern: `^(?:\s*(\d+)d)?\s*(\d+h)?...` Hmm whitespace between parts, but not within number-unit. Use pattern: `\s*(?:([0-9]+)d)?\s*(?:([0-9]+)h)?\s*(?:([0-9]+)m)?\s*(?:([0-9]+)s)?\s*` with fullmatch — but then "1d 1h" ok; empty string would match (all optional) — must reject empty. Also "1d 4s": between d and s there's space — pattern `\s*` handles. But careful: "1 h" — space between number and unit wouldn't match `(\d+)h`. Good. "1d4" — trailing `4` doesn't match, fullmatch fails. Good. Also need to reject strings where a unit repeats — fullmatch handles. Order enforced structurally.

But one subtlety: "5" alone — number without unit: fullmatch fails since number not followed by unit. Good. "" and "   ": reject explicitly. Also multi-digit leading zeros? "007d" — non-negative integer, fine.

Edge: could `\d+` in optional group split? "12d" matches group. Fine.

Also need reject "1d 1d" — second d can't match since group already used; fullmatch fails. Good.

Whitespace: `\s` includes other whitespace like tabs — "leading/trailing whitespace is allowed" and separators "one or more spaces". Should tabs be rejected? Strictly, other separators invalid. Use `[ ]` for separators? Leading/trailing whitespace allowed — I'll allow `\s` for leading/trailing but single-or-more spaces between? Simpler: use `[ \t\n]`? To be safe, allow only spaces for separation: pattern `\s*(?:(\d+)d)?(?: (\d+)h)?...` Hmm, "one or more spaces" between parts. Let me define sep = `[ ]*`? Actually "one or more spaces" but probably between parts at least one? "1h 30m" separated by spaces. Between parts with no space also allowed. So between parts: `\s*`? I'll use `[ ]*` for internal separators and `re.strip()`... Use `.strip()` then pattern with `[ ]*` between parts. Actually stripping handles leading/trailing whitespace including tabs. Between parts, `[ ]+`. But "1h 30m" fine; "1h30m" fine (zero spaces).

Pattern: `(?:({n})d)?(?:[ ]+({n})h)?(?:[ ]+({n})m)?(?:[ ]+({n})s)?` fullmatch, n = `\d+`. But "1d 4s": after d optional group, then `[ ]+` before s optional group — matches " ". Good. "1d " — stripped. "1d4h" fine.

Wait issue: `\d+` greedy with following unit — fine.

Another subtlety: `[ ]+` before an absent optional group — regex engine will try to match `(?:[ ]+(\d+)m)?`; if not, skip. Fine.

Empty after strip: fullmatch matches empty — reject explicitly.

Compute total.