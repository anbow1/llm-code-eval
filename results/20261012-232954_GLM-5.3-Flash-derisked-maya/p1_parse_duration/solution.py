import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_UNIT_ORDER = {"d": 0, "h": 1, "m": 2, "s": 3}
_PART_RE = re.compile(r"(\d+)([dhms])")
_TOKEN_RE = re.compile(r"\d+[dhms](?:\d+[dhms])*")


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")

    stripped = s.strip()
    if not stripped:
        raise ValueError("empty duration string")

    tokens = stripped.split()
    total = 0
    last_rank = -1

    for token in tokens:
        if not _TOKEN_RE.fullmatch(token):
            raise ValueError(f"invalid duration part: {token!r}")
        for match in _PART_RE.finditer(token):
            number = int(match.group(1))
            unit = match.group(2)
            rank = _UNIT_ORDER[unit]
            if rank <= last_rank:
                raise ValueError(
                    f"units must appear in order d, h, m, s and at most once: {s!r}"
                )
            last_rank = rank
            total += number * _UNIT_SECONDS[unit]

    return total
