Parse with regex. Need to ensure full match, order, uniqueness. Approach: strip, tokenize parts, validate order.

Plan: regex finditer on `\d+([dhms])` but need to ensure whole string consumed exactly. Alternative: validate whole string with fullmatch of pattern `(?:(\d+)d)?...` with order enforced — but regex alone can't enforce "at most once each" easily; actually it can: `^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$` with re.fullmatch ensures each unit at most once and in order. Digits must be non-negative integers — but leading zeros? "007m" — integer, fine. "0m" fine.

But careful: "number without unit" — digits followed by something else. Also missing number e.g. "hm" fails fullmatch. But issue: "1h 30m" has spaces between parts. Handle by removing spaces between parts? Leading/trailing whitespace allowed; separated by one or more spaces. So strip, split on whitespace? But parts may be joined without spaces too. So: strip, then split on whitespace to get groups, then concatenate? Each group is parts joined without space. So remove all whitespace after stripping? But must reject "other separators" — tabs are whitespace, arguably fine? "separated by one or more spaces" — spaces specifically. Hmm, but leading/trailing whitespace allowed. Safer: strip only spaces? Let's just handle spaces: validate that after stripping spaces, the rest matches pattern. But need to reject things like "1h\t30m" maybe? Simpler: use fullmatch on string with pattern that allows spaces between parts:

pattern: `(?:(\d+)d)(?:\s+(\d+)h)?...` — messy. Simplest: strip the string, then check that removing whitespace... Actually simplest robust: split into tokens, but tokens can be joined. Approach: remove all spaces within (after strip leading/trailing spaces), then fullmatch ordered pattern. But "1 h 30m" — space between number and unit is invalid per rules ("NO space between number and unit"). Removing spaces would accept "1 h30m" incorrectly. Hmm.

Better: parse parts: regex to find all parts `(\d+)([dhms])` and ensure positions cover the string except single spaces between parts.

Alternative approach: fullmatch pattern with optional spaces between parts:

`\s*(?:(\d+)d)(?:\s+(?:(\d+)h))?(?:\s+(?:(\d+)m))?...` — messy with optional chaining.

Cleaner: tokenize manually. Steps:
1. If s is empty or all whitespace → ValueError.
2. Split on whitespace: tokens. Each token must be a sequence of parts concatenated. But "1h 30" — token "30" has number without unit → error.
3. For each token, findall `(\d+)([dhms])`, and verify the concatenation of matches reconstructs the token exactly (to reject "1h30m5", "1.5h", "1hh", "1x30m" etc. — "1x30m": findall gives "30m", concatenation "30m" != "1x30m" → error). Good.
4. Flatten parts, check order: allowed indices d<h<m<s, strictly increasing (each at most once, order enforced).

Compute total.

Also "number without unit" like "5" alone: findall gives nothing, concat "" != "5" → error. "hm": no digits, concat "" != "hm" → error. Good.

Leading zeros fine. Big numbers fine (Python int).

Edge: token like "1h30m" → parts (1,h),(30,m). Good. "1d4s" fine.

Order check: indices must be strictly increasing. E.g., "30m2d" → indices 2,0 → not increasing → error. "1m1m" → repeated → not strictly increasing → error.

Implement:

```python
import re

def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError(...)
    tokens = s.split()  # splits on any whitespace
    unit_index = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    total = 0
    prev = -1
    for token in tokens:
        parts = re.findall(r'(\d+)([dhms])', token)
        if ''.join(n + u for n, u in parts) != token:
            raise ValueError(...)
        for n, u in parts:
            idx = unit_index[u]
            if idx <= prev:
                raise ValueError(...)
            prev = idx
            total += int(n) * (86400, 3600, 60, 1)[idx]
    return total
```

Wait — order across tokens: "1h 30m" — prev updates across tokens; that's correct since order applies globally. "1h 2d" should be error (wrong order). Yes.

But also "1h30" token: findall gives ('1','h'), concat "1h" != "1h30" → error. Good.

"s.split()" splits on any whitespace including tabs/newlines — rules say spaces, but being lenient with whitespace is probably fine; leading/trailing whitespace allowed. Actually could a tab in middle be a "other separator"? Ambiguous; using split on whitespace is acceptable.

Edge: empty string → s.strip() empty → error. Good.

Write final.