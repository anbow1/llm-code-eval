import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("Empty or blank string")

    pattern = re.compile(r'(\d+)([dhms])')

    pos = 0
    parts: list[tuple[int, str]] = []

    while pos < len(stripped):
        # Skip spaces between parts
        while pos < len(stripped) and stripped[pos] == ' ':
            pos += 1
        if pos >= len(stripped):
            break

        m = pattern.match(stripped, pos)
        if m is None:
            raise ValueError(f"Invalid token at position {pos}: {stripped[pos:]!r}")
        num_str, unit = m.group(1), m.group(2)
        parts.append((int(num_str), unit))
        pos = m.end()

    if not parts:
        raise ValueError("No valid duration parts found")

    # Validate: each unit at most once, units in d,h,m,s order
    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    seen: set[str] = set()
    prev_idx = -1

    for _num, unit in parts:
        if unit in seen:
            raise ValueError(f"Repeated unit: {unit!r}")
        seen.add(unit)
        idx = order[unit]
        if idx <= prev_idx:
            raise ValueError(f"Units out of order: {unit!r}")
        prev_idx = idx

    multipliers = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    total = sum(num * multipliers[unit] for num, unit in parts)
    return total
