

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    parts = re.split(r' +', s)

    pattern = re.compile(r'^\d+[dhms]$')
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen: set[str] = set()
    last_order = -1
    total = 0

    for part in parts:
        if not pattern.match(part):
            raise ValueError(f"invalid part: {part!r}")

        unit = part[-1]
        number = int(part[:-1])

        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")

        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"wrong unit order: {unit}")

        seen.add(unit)
        last_order = order
        total += number * unit_seconds[unit]

    return total
```