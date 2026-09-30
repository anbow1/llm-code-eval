

```python
def parse_duration(s: str) -> int:
    import re

    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    # Only allow digits, unit letters, and spaces
    if not re.fullmatch(r'[0-9dhms ]+', s):
        raise ValueError("Invalid characters in duration string")

    # Extract all valid tokens (number followed by a unit)
    tokens = re.findall(r'\d+[dhms]', s)

    # Verify the string is fully composed of tokens and spaces
    # (no leftover characters like a bare number or bare unit)
    leftover = re.sub(r'\d+[dhms]', '', s)
    if leftover.replace(' ', '') != '':
        raise ValueError("Invalid format: number without unit or unexpected characters")

    if not tokens:
        raise ValueError("No valid duration parts found")

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    last_order = -1
    total = 0

    for token in tokens:
        unit = token[-1]
        num_str = token[:-1]
        order = unit_order[unit]
        if order <= last_order:
            raise ValueError(f"Wrong order or repeated unit: {unit}")
        last_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
```