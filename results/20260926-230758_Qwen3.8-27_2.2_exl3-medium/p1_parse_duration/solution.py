import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    # Validate overall structure: parts joined by zero or more space-separated groups
    if not re.fullmatch(r'(?:\d+[dhms])(?: +\d+[dhms])*', s):
        raise ValueError("invalid duration format")

    parts = re.findall(r'\d+[dhms]', s)

    # Validate unit order (d < h < m < s) and uniqueness
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    prev = -1
    for part in parts:
        unit = part[-1]
        order = unit_order[unit]
        if order <= prev:
            raise ValueError("wrong order or repeated unit")
        prev = order

    # Compute total seconds
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = 0
    for part in parts:
        unit = part[-1]
        num = int(part[:-1])
        total += num * unit_seconds[unit]

    return total
