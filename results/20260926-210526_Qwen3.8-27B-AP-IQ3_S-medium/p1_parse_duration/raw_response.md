```python
import re


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")

    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    # The entire stripped string must consist of one or more <digits><unit> parts,
    # optionally separated by zero or more space characters.
    if not re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration string: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', stripped)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    prev_order = -1
    seen_units: set[str] = set()
    total = 0

    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)

        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order: {unit} after a higher or equal unit")
        prev_order = order

        total += int(num_str) * unit_values[unit]

    return total
```