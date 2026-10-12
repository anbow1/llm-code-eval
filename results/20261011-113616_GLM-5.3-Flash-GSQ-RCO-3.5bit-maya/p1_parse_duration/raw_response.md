```python
import re

_DURATION_RE = re.compile(
    r"""^\s*
        (?:(\d+)d)?\s*
        (?:(\d+)h)?\s*
        (?:(\d+)m)?\s*
        (?:(\d+)s)?\s*
        $""",
    re.ASCII | re.VERBOSE,
)

_UNIT_MULTIPLIERS = (
    ("d", 86400),
    ("h", 3600),
    ("m", 60),
    ("s", 1),
)


def parse_duration(s: str) -> int:
    """
    Convert a duration string to total seconds.

    Accepted format: a sequence of parts `<non-negative integer><unit>` for
    units d, h, m, s in that order, each unit at most once, parts optionally
    separated by whitespace, with optional leading/trailing whitespace.

    Raises ValueError for anything else.
    """
    match = _DURATION_RE.fullmatch(s)
    if match is None:
        raise ValueError(f"invalid duration string: {s!r}")

    total = 0
    matched_any = False
    for value, (unit, multiplier) in zip(match.groups(), _UNIT_MULTIPLIERS):
        if value is not None:
            matched_any = True
            total += int(value) * multiplier

    if not matched_any:
        raise ValueError(f"invalid duration string: {s!r}")

    return total
```