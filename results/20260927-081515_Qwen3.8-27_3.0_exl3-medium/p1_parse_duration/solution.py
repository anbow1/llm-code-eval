import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    # Validate the overall structure: one or more <digits><unit> parts,
    # optionally separated by one or more spaces (no other separators).
    if not re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', s):
        raise ValueError(f"Invalid duration string: {s!r}")

    # Extract individual parts (number + unit).
    parts = re.findall(r'\d+[dhms]', s)

    # Validate unit order (d < h < m < s) and uniqueness.
    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen: set[str] = set()
    last_idx = -1
    for part in parts:
        unit = part[-1]
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit!r}")
        if order[unit] <= last_idx:
            raise ValueError(f"Wrong unit order: {unit!r} after a later unit")
        seen.add(unit)
        last_idx = order[unit]

    # Compute total seconds.
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = 0
    for part in parts:
        num = int(part[:-1])
        unit = part[-1]
        total += num * unit_seconds[unit]

    return total
