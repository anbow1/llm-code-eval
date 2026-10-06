```python
import re

_UNIT_RANK = {"d": 4, "h": 3, "m": 2, "s": 1}
_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}

_TOKEN_RE = re.compile(r"(?:(\d+)([dhms]))+")
_PART_RE = re.compile(r"(\d+)([dhms])")


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")

    tokens = s.split()
    if not tokens:
        raise ValueError("empty or blank duration string")

    total = 0
    last_rank = float("inf")

    for token in tokens:
        # The token must be entirely composed of number+unit parts.
        full_match = re.fullmatch(r"(?:\d+[dhms])+", token)
        if full_match is None:
            raise ValueError(f"invalid duration part: {token!r}")

        for match in _PART_RE.finditer(token):
            number_str, unit = match.group(1), match.group(2)
            rank = _UNIT_RANK[unit]
            if rank >= last_rank:
                raise ValueError(
                    f"unit {unit!r} out of order or repeated after a smaller-or-equal unit"
                )
            last_rank = rank
            total += int(number_str) * _UNIT_SECONDS[unit]

    return total
```