import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    if not re.fullmatch(r'(\d+[dhms])(?: *\d+[dhms])*', s):
        raise ValueError("invalid duration format")

    parts = re.findall(r'(\d+)([dhms])', s)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    total = 0
    prev_order = -1
    seen = set()

    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError("units out of order")
        seen.add(unit)
        prev_order = order
        total += int(num_str) * unit_seconds[unit]

    return total
