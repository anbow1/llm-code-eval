import re

_PART_PATTERN = re.compile(
    r"^(?:(\d+)d)?(?:\s*(\d+)h)?(?:\s*(\d+)m)?(?:\s*(\d+)s)?$"
)

_UNIT_SECONDS = {
    0: 86400,  # d
    1: 3600,   # h
    2: 60,     # m
    3: 1,      # s
}


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank duration string")
    match = _PART_PATTERN.fullmatch(stripped)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")
    total = 0
    for group_index, seconds in _UNIT_SECONDS.items():
        raw = match.group(group_index + 1)
        if raw is not None:
            total += int(raw) * seconds
    return total
