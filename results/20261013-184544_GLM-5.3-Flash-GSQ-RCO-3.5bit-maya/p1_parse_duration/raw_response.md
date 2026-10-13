```python
import re

_PATTERN = re.compile(
    r"\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*"
)

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}


def parse_duration(s: str) -> int:
    match = _PATTERN.fullmatch(s)
    if match is None or all(group is None for group in match.groups()):
        raise ValueError(f"invalid duration string: {s!r}")
    total = 0
    for unit, value in zip(_UNIT_SECONDS, match.groups()):
        if value is not None:
            total += int(value) * _UNIT_SECONDS[unit]
    return total
```