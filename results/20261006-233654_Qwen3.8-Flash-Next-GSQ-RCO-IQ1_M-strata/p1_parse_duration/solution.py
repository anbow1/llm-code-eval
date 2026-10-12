import re

_DURATION_PATTERN = re.compile(
    r"(?:(?P<days>[0-9]+)d *)?"
    r"(?:(?P<hours>[0-9]+)h *)?"
    r"(?:(?P<minutes>[0-9]+)m *)?"
    r"(?:(?P<seconds>[0-9]+)s)?"
)

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError

    s = s.strip()
    if not s:
        raise ValueError

    match = _DURATION_PATTERN.fullmatch(s)
    if match is None:
        raise ValueError

    total = 0

    if match["days"] is not None:
        total += int(match["days"]) * 86400
    if match["hours"] is not None:
        total += int(match["hours"]) * 3600
    if match["minutes"] is not None:
        total += int(match["minutes"]) * 60
    if match["seconds"] is not None:
        total += int(match["seconds"])

    return total
