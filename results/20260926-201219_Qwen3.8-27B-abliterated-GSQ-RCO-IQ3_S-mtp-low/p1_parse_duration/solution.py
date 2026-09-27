import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")

    if not re.fullmatch(r'\d+[dhms](?:(?:\s+)?\d+[dhms])*', stripped):
        raise ValueError(f"invalid duration format: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', stripped)

    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen = set()
    last_order = -1
    total = 0

    for num, unit in parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if order[unit] <= last_order:
            raise ValueError(f"units out of order: {unit}")
        seen.add(unit)
        last_order = order[unit]
        total += int(num) * multipliers[unit]

    return total
