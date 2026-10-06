```python
import re


def parse_duration(s: str) -> int:
    UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    UNIT_ORDER = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")

    # Split on single space characters; filter out empties (handles multiple consecutive spaces)
    tokens = [t for t in stripped.split(' ') if t]

    if not tokens:
        raise ValueError("empty or blank string")

    part_re = re.compile(r'(\d+)([dhms])')
    all_parts: list[tuple[str, int]] = []

    for token in tokens:
        pos = 0
        while pos < len(token):
            m = part_re.match(token, pos)
            if m is None:
                raise ValueError(f"invalid token: {token!r}")
            all_parts.append((m.group(2), int(m.group(1))))
            pos = m.end()

    # Validate uniqueness and ordering
    seen: set[str] = set()
    last_idx = -1
    for unit, _ in all_parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        seen.add(unit)
        idx = UNIT_ORDER[unit]
        if idx <= last_idx:
            raise ValueError("units out of order")
        last_idx = idx

    return sum(value * UNIT_SECONDS[unit] for unit, value in all_parts)
```