import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}

_PATTERN = re.compile(
    r"(?:(?P<d>\d+)d)?(?:(?P<h>\d+)h)?(?:(?P<m>\d+)m)?(?:(?P<s>\d+)s)?"
)


def parse_duration(s: str) -> int:
    parts = s.split()
    if not parts:
        raise ValueError("empty or blank duration string")
    compact = "".join(parts)

    match = _PATTERN.fullmatch(compact)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")

    total = 0
    for unit, value in match.groupdict().items():
        if value is not None:
            total += int(value) * _UNIT_SECONDS[unit]
    return total
