```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    # Validate overall format: one or more <digits><unit> tokens,
    # optionally separated by whitespace.
    if not re.fullmatch(r'(?:(\d+)([dhms])\s*)+', s):
        raise ValueError(f"Invalid duration string: {s!r}")

    # Extract all (number, unit) pairs.
    pairs = re.findall(r'(\d+)([dhms])', s)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    seen = set()
    last_rank = -1
    total = 0

    for num_str, unit in pairs:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        rank = unit_order[unit]
        if rank <= last_rank:
            raise ValueError("Units out of order")
        seen.add(unit)
        last_rank = rank
        total += int(num_str) * unit_seconds[unit]

    return total
```