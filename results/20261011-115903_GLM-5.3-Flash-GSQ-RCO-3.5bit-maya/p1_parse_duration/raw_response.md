```python
import re

_DURATION_RE = re.compile(
    r"(?:(\d+)d)?[ ]*(?:(\d+)h)?[ ]*(?:(\d+)m)?[ ]*(?:(\d+)s)?"
)


def parse_duration(s: str) -> int:
    """
    Convert a duration string to total seconds.

    Accepted forms: sequences of <non-negative integer><unit> parts where
    unit is one of d, h, m, s (lowercase), units appear at most once and
    in the order d, h, m, s. Parts may be adjacent or separated by one or
    more spaces. Leading/trailing whitespace is allowed.

    Raises ValueError for anything else.
    """
    stripped = s.strip()

    if not stripped:
        raise ValueError(f"invalid duration string: {s!r}")

    match = _DURATION_RE.fullmatch(stripped)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")

    days_s, hours_s, minutes_s, seconds_s = match.groups()

    days = int(days_s) if days_s is not None else 0
    hours = int(hours_s) if hours_s is not None else 0
    minutes = int(minutes_s) if minutes_s is not None else 0
    seconds = int(seconds_s) if seconds_s is not None else 0

    return days * 86400 + hours * 3600 + minutes * 60 + seconds
```