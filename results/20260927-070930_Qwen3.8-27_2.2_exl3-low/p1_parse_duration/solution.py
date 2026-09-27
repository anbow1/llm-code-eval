import re


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank string")

    pattern = re.compile(r'\d+[dhms]')
    matches = list(pattern.finditer(stripped))

    if not matches:
        raise ValueError("no valid duration tokens")

    if matches[0].start() != 0:
        raise ValueError("invalid leading characters")

    if matches[-1].end() != len(stripped):
        raise ValueError("invalid trailing characters")

    for i in range(1, len(matches)):
        gap = stripped[matches[i - 1].end():matches[i].start()]
        if gap and not all(c == ' ' for c in gap):
            raise ValueError(f"invalid separator: {gap!r}")

    units_order = ['d', 'h', 'm', 's']
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    seen: list[str] = []
    total = 0

    for m in matches:
        token = m.group()
        unit = token[-1]
        num = int(token[:-1])

        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")

        if seen and units_order.index(unit) <= units_order.index(seen[-1]):
            raise ValueError(f"wrong unit order: {seen[-1]} before {unit}")

        seen.append(unit)
        total += num * unit_seconds[unit]

    return total
