```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    # Validate characters: only digits, d, h, m, s, and space are allowed
    for ch in s:
        if ch not in '0123456789dhms ':
            raise ValueError(f"Invalid character: {ch!r}")

    # Extract all (number, unit) parts
    parts = re.findall(r'(\d+)([dhms])', s)

    # Ensure the string is fully composed of valid parts + spaces
    reconstructed = ''.join(f"{num}{unit}" for num, unit in parts)
    if s.replace(' ', '') != reconstructed:
        raise ValueError("Invalid format: missing unit or malformed part")

    # Validate unit order (d, h, m, s) and uniqueness
    valid_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    seen = set()
    last_idx = -1
    total = 0

    for num, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")
        seen.add(unit)
        idx = valid_order[unit]
        if idx <= last_idx:
            raise ValueError(f"Wrong unit order: {unit}")
        last_idx = idx
        total += int(num) * unit_seconds[unit]

    return total
```