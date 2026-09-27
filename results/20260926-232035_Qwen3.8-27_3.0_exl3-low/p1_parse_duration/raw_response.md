

```python
import re


def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("Empty or blank string")

    stripped = s.strip()
    tokens = re.split(r'\s+', stripped)

    units_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen_units: list[str] = []
    total = 0

    for token in tokens:
        if not re.fullmatch(r'(?:\d+[dhms])+', token):
            raise ValueError(f"Invalid token: {token!r}")

        parts = re.findall(r'(\d+)([dhms])', token)
        for num_str, unit in parts:
            if unit in seen_units:
                raise ValueError(f"Repeated unit: {unit}")
            if seen_units and units_order[unit] <= units_order[seen_units[-1]]:
                raise ValueError(f"Wrong order: {unit} after {seen_units[-1]}")
            seen_units.append(unit)
            total += int(num_str) * unit_seconds[unit]

    return total
```