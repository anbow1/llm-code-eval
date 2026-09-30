```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    pattern = r'(\d+[dhms])(\s*\d+[dhms])*'
    if not re.fullmatch(pattern, s):
        raise ValueError("invalid duration format")

    parts = re.findall(r'(\d+)([dhms])', s)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen = set()
    last_order = -1
    total = 0

    for num_str, unit in parts:
        if unit in seen:
            raise ValueError("repeated unit")
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("units must appear in order d, h, m, s")
        seen.add(unit)
        last_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
```