```python
def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")

    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    i = 0
    n = len(stripped)
    last_order = -1

    while i < n:
        # Skip spaces between parts
        if stripped[i] == ' ':
            i += 1
            continue

        # Must start with a digit
        if not stripped[i].isdigit():
            raise ValueError("unknown or unexpected character")

        # Read the integer part
        num_start = i
        while i < n and stripped[i].isdigit():
            i += 1

        # Must be followed by a unit character (no space between number and unit)
        if i >= n:
            raise ValueError("number without unit")

        unit_char = stripped[i]
        if unit_char not in units:
            raise ValueError("unknown unit")

        # Validate ordering and no repeats
        cur_order = unit_order[unit_char]
        if cur_order <= last_order:
            raise ValueError("wrong order or repeated unit")

        last_order = cur_order
        total += int(stripped[num_start:i]) * units[unit_char]
        i += 1

    return total
```