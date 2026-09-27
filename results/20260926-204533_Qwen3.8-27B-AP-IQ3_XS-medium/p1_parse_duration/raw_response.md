```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    pattern = re.compile(r'(?:\d+[dhms])(?: *\d+[dhms])*')
    if not pattern.fullmatch(s):
        raise ValueError("Invalid duration format")

    parts = re.findall(r'(\d+)([dhms])', s)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    last_order = -1
    seen_units = set()

    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)

        if unit_order[unit] < last_order:
            raise ValueError(f"Wrong unit order: {unit} after previous units")

        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]

    return total
```