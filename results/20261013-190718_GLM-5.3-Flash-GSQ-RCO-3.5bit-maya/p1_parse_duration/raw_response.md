```python
import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}

_DURATION_RE = re.compile(
    r"\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*"
)


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    match = _DURATION_RE.fullmatch(s)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")
    parts = match.groups()
    if all(part is None for part in parts):
        raise ValueError("empty or blank duration string")
    total = 0
    for part, unit in zip(parts, "dhms"):
        if part is not None:
            total += int(part) * _UNIT_SECONDS[unit]
    return total
```