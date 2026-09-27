import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    pattern = r'\d+[dhms]( *\d+[dhms])*'
    if not re.fullmatch(pattern, s):
        raise ValueError(f"invalid duration: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', s)

    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    prev_order = -1
    seen_units = set()

    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit}")
        if unit_order[unit] <= prev_order:
            raise ValueError(f"units out of order: {unit}")
        seen_units.add(unit)
        prev_order = unit_order[unit]
        total += int(num_str) * unit_values[unit]

    return total
