

```python
import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    if not re.fullmatch(r'\d+[dhms]( +\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration string: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', stripped)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    last_order = -1
    seen_units: set[str] = set()

    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong unit order: {unit}")
        last_order = order
        seen_units.add(unit)
        total += int(num_str) * unit_seconds[unit]

    return total
```