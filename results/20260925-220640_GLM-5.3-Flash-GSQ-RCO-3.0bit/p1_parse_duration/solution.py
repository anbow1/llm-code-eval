import re

_PART_PATTERN = re.compile(
    r"\s*(?:(?P<d>[0-9]+)d\s*)?"
    r"(?:(?P<h>[0-9]+)h\s*)?"
    r"(?:(?P<m>[0-9]+)m\s*)?"
    r"(?:(?P<s>[0-9]+)s\s*)?"
)

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}


def parse_duration(s: str) -> int:
    match = _PART_PATTERN.fullmatch(s)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")
    parts = match.groupdict()
    if all(value is None for value in parts.values()):
        raise ValueError(f"invalid duration string: {s!r}")
    total = 0
    for unit, value in parts.items():
        if value is not None:
            total += int(value) * _UNIT_SECONDS[unit]
    return total
