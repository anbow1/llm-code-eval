

```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    match = re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', s)
    if not match:
        raise ValueError(f"Invalid duration string: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', s)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    prev_order = -1
    seen = set()

    for num, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit!r}")
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Units out of order: {unit!r}")
        prev_order = order
        seen.add(unit)
        total += int(num) * unit_seconds[unit]

    return total
```