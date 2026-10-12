import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    # Valid format: one or more parts, each \d+[dhms], separated by optional spaces
    pattern = r'\d+[dhms]( *\d+[dhms])*'

    if not re.fullmatch(pattern, stripped):
        raise ValueError(f"Invalid duration format: {s!r}")

    # Extract all (number, unit) pairs
    parts = re.findall(r'(\d+)([dhms])', stripped)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen: set[str] = set()
    last_order = -1
    total = 0

    for num_str, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: '{unit}'")
        if unit_order[unit] <= last_order:
            raise ValueError("Units must appear in order: d, h, m, s")
        seen.add(unit)
        last_order = unit_order[unit]
        total += int(num_str) * unit_seconds[unit]

    return total
