import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    parts = s.split()
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen = []
    total = 0

    for part in parts:
        m = re.fullmatch(r'(\d+)([dhms])', part)
        if not m:
            raise ValueError(f"invalid part: {part!r}")
        num = int(m.group(1))
        unit = m.group(2)
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if seen and unit_order[unit] <= unit_order[seen[-1]]:
            raise ValueError(f"wrong order: {unit} after {seen[-1]}")
        seen.append(unit)
        total += num * unit_seconds[unit]

    return total
