import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty duration string")
    tokens = stripped.split()
    if any(not token for token in tokens):
        raise ValueError("invalid whitespace")
    order = {"d": 0, "h": 1, "m": 2, "s": 3}
    weights = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    seen = set()
    last_order = -1
    total = 0
    part_re = re.compile(r"^(\d+)([dhms])$")
    for token in tokens:
        m = part_re.fullmatch(token)
        if not m:
            raise ValueError(f"invalid duration part: {token!r}")
        number, unit = m.group(1), m.group(2)
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if order[unit] <= last_order:
            raise ValueError(f"unit out of order: {unit}")
        seen.add(unit)
        last_order = order[unit]
        total += int(number) * weights[unit]
    return total
