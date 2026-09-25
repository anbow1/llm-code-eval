```python
import re

_DURATION_RE = re.compile(r"(?:[0-9]+[dhms])(?:[ ]*[0-9]+[dhms])*")
_PART_RE = re.compile(r"([0-9]+)([dhms])")

_UNIT_SECONDS = {
    "d": 86_400,
    "h": 3_600,
    "m": 60,
    "s": 1,
}

_UNIT_ORDER = {
    "d": 0,
    "h": 1,
    "m": 2,
    "s": 3,
}


def parse_duration(s: str) -> int:
    t = s.strip()
    if not _DURATION_RE.fullmatch(t):
        raise ValueError("invalid duration")

    total = 0
    last_order = -1

    for number, unit in _PART_RE.findall(t):
        order = _UNIT_ORDER[unit]
        if order <= last_order:
            raise ValueError("invalid duration")

        last_order = order
        total += int(number) * _UNIT_SECONDS[unit]

    return total
```