import re

_DURATION_RE = re.compile(
    r"\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\s*"
)

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}


def parse_duration(s: str) -> int:
    match = _DURATION_RE.fullmatch(s)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")
    d, h, m, sec = match.groups()
    if d is None and h is None and m is None and sec is None:
        raise ValueError(f"invalid duration string: {s!r}")
    total = 0
    for value, unit in ((d, "d"), (h, "h"), (m, "m"), (sec, "s")):
        if value is not None:
            total += int(value) * _UNIT_SECONDS[unit]
    return total
