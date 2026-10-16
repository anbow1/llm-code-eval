import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    # Overall structure: one or more parts of <digits><unit>, optionally separated by spaces
    if not re.fullmatch(r'\d+[dhms](?:\s*\d+[dhms])*', s):
        raise ValueError(f"invalid duration string: {s!r}")

    parts = re.findall(r'\d+[dhms]', s)

    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}

    total = 0
    last_pos = -1
    seen: set[str] = set()

    for part in parts:
        unit = part[-1]
        number = int(part[:-1])

        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        seen.add(unit)

        pos = unit_order[unit]
        if pos < last_pos:
            raise ValueError(f"units out of order: {unit} appears before a later unit")
        last_pos = pos

        total += number * unit_seconds[unit]

    return total
