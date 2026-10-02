import re

_PART = re.compile(r'(\d+)([dhms])')
_RANK = {'d': 0, 'h': 1, 'm': 2, 's': 3}
_SECONDS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}


def parse_duration(s: str) -> int:
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank duration string")

    tokens = stripped.split()
    last_rank = -1
    total = 0

    for token in tokens:
        pos = 0
        while pos < len(token):
            m = _PART.match(token, pos)
            if m is None:
                raise ValueError(f"invalid part at position {pos} in token {token!r}")
            unit = m.group(2)
            rank = _RANK[unit]
            if rank <= last_rank:
                raise ValueError(f"unit {unit!r} out of order or repeated")
            last_rank = rank
            total += int(m.group(1)) * _SECONDS[unit]
            pos = m.end()

    return total
