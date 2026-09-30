```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = ['d', 'h', 'm', 's']

    tokens = re.split(r'\s+', s)

    parts = []
    for token in tokens:
        matches = re.findall(r'(\d+)([dhms])', token)
        reconstructed = ''.join(num + u for num, u in matches)
        if not matches or reconstructed != token:
            raise ValueError(f"invalid token: {token!r}")
        for num_str, unit in matches:
            parts.append((int(num_str), unit))

    seen_units = set()
    last_order = -1
    total = 0

    for num, unit in parts:
        if unit not in unit_order:
            raise ValueError(f"unknown unit: {unit}")
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        order = unit_order.index(unit)
        if order <= last_order:
            raise ValueError("units out of order")
        seen_units.add(unit)
        last_order = order
        total += num * unit_seconds[unit]

    return total
```