```python
import re

_SECONDS_PER_UNIT = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

# Each part: digits immediately followed by its unit, units strictly in the
# order d, h, m, s, each appearing at most once. Between consecutive parts
# there may be zero or more ASCII spaces (zero spaces allows "1h30m"; one or
# more allows "1h 30m"). Leading/trailing whitespace of any kind is allowed.
# Internal separators must be ASCII spaces only (tabs/newlines rejected).
_DURATION_PATTERN = re.compile(
    r'\s*'
    r'(?:(\d+)d)?'
    r'(?:[ ]*(\d+)h)?'
    r'(?:[ ]*(\d+)m)?'
    r'(?:[ ]*(\d+)s)?'
    r'\s*'
)


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    if not s.strip():
        raise ValueError("empty or blank duration string")

    match = _DURATION_PATTERN.fullmatch(s)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")

    # A successful fullmatch means every non-whitespace character was
    # consumed by one of the four parts, so at least one part matched
    # whenever the stripped string is non-empty.
    total = 0
    for number, unit in zip(match.groups(), ('d', 'h', 'm', 's')):
        if number is not None:
            total += int(number) * _SECONDS_PER_UNIT[unit]
    return total
```