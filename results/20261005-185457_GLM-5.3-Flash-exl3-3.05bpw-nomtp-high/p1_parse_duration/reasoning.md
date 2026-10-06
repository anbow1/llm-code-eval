Parse with regex like `^(?:(\d+)d)?...$` but also allow spaces between parts. Simplest: strip and split on whitespace, then each token must match `\d+[dhms]` fully, validate order across tokens and within token order.

But careful: "1d4s" — within one token, units in order d,s skipping h,m — that's fine (subset, order preserved). Also "1h 30m". Each token could contain multiple parts. Spaces allow arbitrary splits like "1h30 m"? That would make token "m" — missing number → error. Good.

Approach: tokens = s.split(). Each token: match repeatedly `\d+[dhms]` at start until consumed; require at least one match, full consumption. Track order strictly increasing across the whole string, no repeats.

Edge: token must not be empty; number must be non-empty (`\d+`). Signs/decimals rejected by regex. Uppercase rejected.

Implement:

```python
import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_PART = re.compile(r"(\d+)([dhms])")
_ORDER = "dhms"

def parse_duration(s: str) -> int:
    if not s.split():
        raise ValueError(...)
```

Actually if s.strip()=="" raise. Then tokens.

```python
def parse_duration(s):
    tokens = s.split()
    if not tokens:
        raise ValueError("empty or blank duration string")
    total = 0
    last_idx = -1
    seen = set()
    for token in tokens:
        pos = 0
        while pos < len(token):
            m = _PART.match(token, pos)
            if not m:
                raise ValueError(...)
            unit = m.group(2)
            idx = _ORDER.index(unit)
            if idx <= last_idx or unit in seen:
                raise ValueError
            total += int(m.group(1)) * _UNIT_SECONDS[unit]
            seen.add(unit)
            last_idx = idx
            pos = m.end()
    return total
```

Wait: repeated check — `unit in seen` suffices since each unit at most once, and idx <= last_idx with last_idx increasing means strictly increasing. But since seen guarantees uniqueness and uniqueness + order... if a unit repeats it's caught by seen. If units not repeated but out of order, idx <= last_idx catches. Actually since seen ensures unique, order check: idx must be > last_idx. Fine.

Empty token can't occur after split. Number "0d" fine.

Leading `+` sign: `_PART.match` fails → ValueError. Decimals fail. Good.