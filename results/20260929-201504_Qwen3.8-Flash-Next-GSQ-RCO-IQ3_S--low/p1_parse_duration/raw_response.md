```python
import re


def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank string")

    pattern = r'^\s*(\d+[dhms](?:[ ]*\d+[dhms])*)\s*$'
    m = re.fullmatch(pattern, s)
    if m is None:
        raise ValueError("invalid duration string")

    parts = re.findall(r'(\d+)([dhms])', m.group(1))

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    prev_order = -1
    seen = set()
    total = 0

    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit!r}")
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"units out of order at {unit!r}")
        seen.add(unit)
        prev_order = order
        total += int(num_str) * multipliers[unit]

    return total
```