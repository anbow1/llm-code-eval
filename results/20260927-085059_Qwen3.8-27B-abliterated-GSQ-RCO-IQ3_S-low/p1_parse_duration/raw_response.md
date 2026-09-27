```python
import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    tokens = re.findall(r'(\d+)([dhms])', stripped)

    # Ensure the entire string is composed of valid tokens separated only by whitespace
    remainder = re.sub(r'\d+[dhms]', '', stripped)
    if remainder.strip():
        raise ValueError("Invalid format")

    if not tokens:
        raise ValueError("No valid duration parts found")

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    total = 0
    last_order = -1
    for num_str, unit in tokens:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("Units out of order or repeated unit")
        last_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
```