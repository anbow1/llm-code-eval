```python
import re

_WEIGHTS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_ORDER = "dhms"

_PART_RE = re.compile(r"(\d+)([dhms])")
_FULL_RE = re.compile(r"\s*(?:\d+[dhms])(?:\s+\d+[dhms])*\s*")


def parse_duration(s: str) -> int:
    if not isinstance(s, str) or _FULL_RE.fullmatch(s) is None:
        raise ValueError(f"invalid duration string: {s!r}")

    parts = _PART_RE.findall(s)
    if not parts:
        raise ValueError(f"invalid duration string: {s!r}")

    total = 0
    prev_index = -1
    for number, unit in parts:
        index = _ORDER.index(unit)
        if index <= prev_index:
            raise ValueError(f"invalid duration string: {s!r}")
        prev_index = index
        total += int(number) * _WEIGHTS[unit]
    return total
```