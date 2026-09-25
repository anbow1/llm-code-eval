import re

# Each part is a non-negative integer immediately followed by its unit,
# units must appear in the fixed order d, h, m, s, each at most once,
# and parts may be separated only by whitespace.
_DURATION_PATTERN = re.compile(
    r'\s*'
    r'(?:(?P<d>[0-9]+)d)?\s*'
    r'(?:(?P<h>[0-9]+)h)?\s*'
    r'(?:(?P<m>[0-9]+)m)?\s*'
    r'(?:(?P<s>[0-9]+)s)?\s*'
)

_UNIT_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}


def parse_duration(s: str) -> int:
    m = _DURATION_PATTERN.fullmatch(s)
    if m is None:
        raise ValueError(f"invalid duration string: {s!r}")

    parts = {unit: int(value) for unit, value in m.groupdict().items() if value is not None}
    if not parts:
        # Matches only whitespace (or empty string) with no parts at all.
        raise ValueError(f"empty duration string: {s!r}")

    return sum(_UNIT_SECONDS[unit] * value for unit, value in parts.items())
