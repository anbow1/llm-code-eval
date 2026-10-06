```python
import re


def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank string")

    # Full-match pattern: optional leading/trailing whitespace, one or more
    # parts of <digits><unit> optionally separated by whitespace.
    pattern = r'^\s*(?:(\d+)([dhms])\s*)+$'
    if not re.fullmatch(pattern, s):
        raise ValueError("invalid duration string")

    unit_multiplier = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    parts = re.finditer(r'(\d+)([dhms])', s)

    total = 0
    last_order = -1
    seen: set[str] = set()

    for m in parts:
        num = int(m.group(1))
        unit = m.group(2)

        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")

        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("units must appear in order d, h, m, s")

        seen.add(unit)
        last_order = order
        total += num * unit_multiplier[unit]

    return total
```