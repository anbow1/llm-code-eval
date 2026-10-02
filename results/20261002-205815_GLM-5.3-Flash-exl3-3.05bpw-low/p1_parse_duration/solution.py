def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("not a string")
    t = s.strip()
    if not t:
        raise ValueError("empty")
    parts = t.split()
    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    order = ['d', 'h', 'm', 's']
    seen = []
    total = 0
    for part in parts:
        if len(part) < 2:
            raise ValueError("invalid part")
        num = part[:-1]
        unit = part[-1]
        if unit not in multipliers:
            raise ValueError("unknown unit")
        if not num.isdigit():
            raise ValueError("invalid number")
        if unit in seen:
            raise ValueError("repeated unit")
        if seen and order.index(unit) >= order.index(seen[-1]):
            raise ValueError("wrong order")
        seen.append(unit)
        total += int(num) * multipliers[unit]
    return total
