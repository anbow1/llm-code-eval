Parse with regex: fullmatch on pattern of parts separated by optional spaces. Pattern: `^(?:(\d+)d)?(?:\s*(\d+)h)?(?:\s*(\d+)m)?(?:\s*(\d+)s)?$` but careful: number without unit must fail — regex already handles. But "1h 30m" allowed with space between parts. Leading/trailing whitespace allowed — strip. Also need to reject empty/blank. Also "12" alone fails fullmatch. Decimals fail. Signs fail.

But subtle: "1d 2h" ok, "2h1d" fails (order). Repeated unit: regex won't match repeated since each group optional once — "1h1h" fails fullmatch. Good.

Edge: "1d2" — fails. "1 h" — space between number and unit fails fullmatch since pattern requires \d+ immediately followed by unit... actually `\s*(\d+)h` — "1 h": the space would be consumed by preceding \s*, then "1h"? No — "1 h": after first part... Let's test "1 h": strip → "1 h". Pattern: optional d part fails, optional h: `\s*(\d+)h` — \s* matches empty, (\d+) matches "1", then needs 'h' but next is ' '. So h part fails, m part fails, s part fails, then $ needed but ' h' remains. Fails. Good.

But careful: "1h 30m": d fails, h matches "1", then `\s*(\d+)m` matches " 30m". Good.

Blank: "   " → strip empty → fullmatch fails? Pattern with all optional parts matches empty string! `^(?:...)?...$` all optional → matches "". So need explicit check: if not s.strip(): raise.

Also "90m" fine. Large numbers fine.

Also "1d4s" works.

One more: what about "1h30m" vs "1h 30 m"? "30 m" fails. Good.

Write code.