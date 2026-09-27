import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    tokens = s.split()

    parts = []
    for token in tokens:
        matches = re.findall(r'(\d+)([dhms])', token)
        reconstructed = ''.join(num + unit for num, unit in matches)
        if reconstructed != token:
            raise ValueError(f"Invalid token: {token!r}")
        parts.extend(matches)

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen_units = set()
    prev_order = -1

    for num, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit}")
        seen_units.add(unit)
        if unit_order[unit] <= prev_order:
            raise ValueError(f"Wrong unit order: {unit}")
        prev_order = unit_order[unit]

    return sum(int(num) * unit_seconds[unit] for num, unit in parts)
