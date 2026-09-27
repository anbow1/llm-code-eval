import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    if not re.fullmatch(r'\d+[dhms](\s*\d+[dhms])*', s):
        raise ValueError(f"invalid duration format: {s!r}")

    parts = re.findall(r'\d+[dhms]', s)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    last_order = -1
    seen_units = set()

    for part in parts:
        unit = part[-1]
        number = int(part[:-1])

        if unit in seen_units:
            raise ValueError(f"repeated unit: {unit!r}")

        if unit_order[unit] <= last_order:
            raise ValueError(f"wrong unit order: {unit!r} after order {last_order}")

        seen_units.add(unit)
        last_order = unit_order[unit]
        total += number * unit_seconds[unit]

    return total
