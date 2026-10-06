import re


def parse_duration(s: str) -> int:
    UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    UNIT_ORDER = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    pattern = r'^(\d+[dhms])(\s*\d+[dhms])*$'
    if not re.fullmatch(pattern, stripped):
        raise ValueError(f"Invalid duration format: {s!r}")

    parts = re.findall(r'(\d+)([dhms])', stripped)

    seen_units = set()
    last_order = -1
    total_seconds = 0

    for num_str, unit in parts:
        if unit in seen_units:
            raise ValueError(f"Repeated unit: {unit!r}")
        order = UNIT_ORDER[unit]
        if order <= last_order:
            raise ValueError(f"Units must appear in order d, h, m, s")
        seen_units.add(unit)
        last_order = order
        total_seconds += int(num_str) * UNIT_SECONDS[unit]

    return total_seconds
