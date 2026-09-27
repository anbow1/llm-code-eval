```python
import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError(f"invalid duration: {s!r}")

    # Validate overall structure: one or more <digits><unit> parts,
    # optionally separated by one or more spaces.
    if not re.fullmatch(r"\d+[dhms]( *\d+[dhms])*", stripped):
        raise ValueError(f"invalid duration format: {s!r}")

    # Extract all (number, unit) pairs
    parts = re.findall(r"(\d+)([dhms])", stripped)

    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    unit_order = {"d": 0, "h": 1, "m": 2, "s": 3}

    total = 0
    last_order = -1
    for num_str, unit in parts:
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"units out of order or repeated in: {s!r}")
        last_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
```