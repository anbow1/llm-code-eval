import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_UNIT_ORDER = "dhms"
_PART = re.compile(r"(\d+)([dhms])")


def parse_duration(s: str) -> int:
    tokens = s.split()
    if not tokens:
        raise ValueError("empty or blank duration string")

    total = 0
    last_index = -1
    seen = set()

    for token in tokens:
        pos = 0
        while pos < len(token):
            match = _PART.match(token, pos)
            if match is None:
                raise ValueError(f"invalid part at position {pos} in {token!r}")

            unit = match.group(2)
            unit_index = _UNIT_ORDER.index(unit)

            if unit in seen:
                raise ValueError(f"repeated unit {unit!r}")
            if unit_index < last_index:
                raise ValueError(f"unit out of order: {unit!r} after {_UNIT_ORDER[:last_index + 1]}")

            total += int(match.group(1)) * _UNIT_SECONDS[unit]
            seen.add(unit)
            last_index = unit_index
            pos = match.end()

    return total
