```python
import re


def parse_duration(s: str) -> int:
    pattern = r'^\s*(\d+[dhms])( +\d+[dhms])*\s*$'
    if not re.fullmatch(pattern, s):
        raise ValueError(f"Invalid duration string: {s!r}")

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    parts = re.findall(r'(\d+)([dhms])', s)

    total = 0
    last_order = -1
    for num_str, unit in parts:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Invalid duration string: {s!r}")
        last_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
```