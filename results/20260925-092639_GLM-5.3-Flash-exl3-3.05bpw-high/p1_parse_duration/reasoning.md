Parse: strip whitespace, split on whitespace into parts. Each part matches ^(\d+)([dhms])$ but the combined ordering check across all parts. Actually parts joined: "1h30m" contains multiple tokens. Tokenize whole string by removing spaces? Approach: remove all whitespace, then tokenize with regex `(\d+)([dhms])` and ensure full match via alternation and no leftovers.

Use re.fullmatch with pattern like: `d?h?m?s?` where each unit has number: `(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?` but all-optional allows empty. Add check that at least one group matched. But `\d+` allows leading zeros — fine. Need to prevent empty match: fullmatch of optional groups matches empty string, so check s non-empty and also that something matched. Since pattern is fully optional, "abc" won't match. But "1h" matches. Empty after strip -> raise.

Careful: `(\d+)` is greedy but with optional following group, backtracking could cause issues? E.g., "1h30m": (\d+)m? "1h" then "30m". Fine. Potential issue: "10d" -> (\d+)d greedy takes "10", then "d". Good.

But subtle: could "12" as "1" + "2"?? Unit must be single char, so no.

Also need to ensure whitespace only spaces? "one or more spaces" — I'll split on whitespace generally, that's fine.

Implementation: remove all whitespace via s.split(), join, then fullmatch pattern with optional repeated groups must not be empty—since empty input raises earlier anyway if string is blank. But " " -> parts empty -> raise. Also ensure pattern requires at least one unit: check fullmatch and that string non-empty — with pattern matching, string must consist entirely of optional groups; a nonempty string matching means at least one group present. Actually could nonempty string match with all groups optional? Only if zero-length, so no — any nonempty match needs at least one unit group. But careful: "d" alone? d group requires number, so no match. Good.

Signs: "+" not in \d+. Decimal "." not allowed. Good.

Use named groups for clarity.