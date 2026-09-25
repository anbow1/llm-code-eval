

```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()

    if not s:
        raise ValueError("Empty or blank string")

    # Only digits, spaces, and the four valid lowercase unit letters are allowed
    if not re.fullmatch(r'[0-9 dhms]+', s):
        raise ValueError("Invalid characters in duration string")

    # Remove all spaces (the only valid separator between parts)
    compact = s.replace(' ', '')

    # The compact string must be one or more <digits><unit> tokens with nothing else
    if not re.fullmatch(r'(\d+[dhms])+', compact):
        raise ValueError("Invalid duration format")

    # Extract each (number, unit) pair
    parts = re.findall(r'(\d+)([dhms])', compact)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen: set[str] = set()
    prev_order = -1
    total = 0

    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: '{unit}'")
        seen.add(unit)

        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError("Units must appear in order d, h, m, s")
        prev_order = order

        total += int(num_str) * multipliers[unit]

    return total
```