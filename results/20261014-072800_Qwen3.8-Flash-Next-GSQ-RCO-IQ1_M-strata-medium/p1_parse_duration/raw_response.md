```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty duration")

    if not re.match(r'^(\d+[dhms] *)+$', s):
        raise ValueError("invalid format")

    tokens = re.findall(r'(\d+)([dhms])', s)

    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    last_order = -1
    for num_str, unit in tokens:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("wrong order or repeated unit")
        last_order = order
        total += int(num_str) * unit_values[unit]

    return total
```