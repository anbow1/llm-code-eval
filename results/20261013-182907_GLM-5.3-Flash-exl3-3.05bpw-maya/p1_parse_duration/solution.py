import re

_UNITS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_ORDER = {"d": 0, "h": 1, "m": 2, "s": 3}
_TOKEN_RE = re.compile(r"\d+[dhms]")


def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")
    if s.strip() == "":
        raise ValueError("empty duration string")

    tokens = _TOKEN_RE.findall(s)

    # Remove all valid tokens and whitespace; anything left means invalid content.
    remainder = _TOKEN_RE.sub("", s).replace(" ", "")
    if remainder != "":
        raise ValueError(f"invalid characters in duration: {s!r}")

    if not tokens:
        raise ValueError(f"no valid duration parts in: {s!r}")

    total = 0
    last_order = -1
    for token in tokens:
        number = token[:-1]
        unit = token[-1]
        order = _ORDER[unit]
        if order <= last_order:
            raise ValueError(f"units out of order or repeated in: {s!r}")
        last_order = order
        total += int(number) * _UNITS[unit]

    return total
