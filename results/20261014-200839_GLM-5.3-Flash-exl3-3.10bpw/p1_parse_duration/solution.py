import re

_PART_N = r"\d+"

_UNIT_SECONDS = {
    "d": 86400,
    "h": 3600,
    "m": 60,
    "s": 1,
}

_PATTERN = re.compile(
    rf"(?:({_PART_N})d)?"
    rf"(?:[ ]+({_PART_N})h)?"
    rf"(?:[ ]+({_PART_N})m)?"
    rf"(?:[ ]+({_PART_N})s)?"
)


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty duration string")

    match = _PATTERN.fullmatch(stripped)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")

    total = 0
    for unit, value in zip(_UNIT_SECONDS, match.groups()):
        if value is not None:
            total += int(value) * _UNIT_SECONDS[unit]
    return total
