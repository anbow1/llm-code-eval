import re


def parse_duration(s: str) -> int:
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    parts = [p for p in s.split(' ') if p]
    if not parts:
        raise ValueError("Empty or blank string")

    total = 0
    last_order = -1

    for part in parts:
        if not re.fullmatch(r'\d+[dhms]', part):
            raise ValueError(f"Invalid part: {part!r}")

        unit = part[-1]
        num = int(part[:-1])

        if unit_order[unit] <= last_order:
            raise ValueError(f"Unit {unit!r} is out of order or repeated")

        last_order = unit_order[unit]
        total += num * unit_seconds[unit]

    return total
