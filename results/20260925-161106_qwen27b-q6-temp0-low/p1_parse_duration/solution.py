import re


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("Input must be a string")

    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    # Find all valid <number><unit> parts
    parts = re.findall(r'(\d+)([dhms])', stripped)

    # Ensure no extra characters remain after removing all valid parts
    remainder = re.sub(r'\d+[dhms]', '', stripped)
    if remainder.strip() != '':
        raise ValueError(f"Invalid duration string: {s!r}")

    if not parts:
        raise ValueError(f"Invalid duration string: {s!r}")

    # Validate order (strictly increasing) and no repeated units
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    last_pos = -1
    total = 0
    for num, unit in parts:
        pos = unit_order[unit]
        if pos <= last_pos:
            raise ValueError(f"Units out of order or repeated in: {s!r}")
        last_pos = pos
        total += int(num) * unit_seconds[unit]

    return total
