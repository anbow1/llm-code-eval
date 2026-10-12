```python
import re

def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("input must be a string")
    stripped = s.strip()
    if not stripped:
        raise ValueError("empty or blank duration string")

    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    order = {u: i for i, u in enumerate("dhms")}

    pattern = re.compile(r"(\d+)([dhms])")

    # Remove spaces that act as separators: all whitespace between parts.
    # Since each part is digits+unit with no internal space, removing all
    # whitespace is safe only if every space is a separator. Check first
    # that all whitespace runs are exactly single/multiple spaces between
    # parts — the token scan below validates structure anyway.
    compact = re.sub(r"\s+", "", stripped)

    # Full-match strict pattern
    if not re.fullmatch(r"(?:\d+[dhms]){1,4}", compact):
        raise ValueError(f"invalid duration string: {s!r}")

    seen = []
    prev_index = -1
    total = 0
    pos = 0
    for match in pattern.finditer(compact):
        num_str, unit = match.group(1), match.group(2)
        # No leading zeros restriction needed; check ordering/uniqueness
        idx = order[unit]
        if unit in seen:
            raise ValueError(f"repeated unit {unit!r}")
        if idx < prev_index:
            raise ValueError(f"unit {unit!r} out of order")
        seen.append(unit)
        prev_index = idx
        total += int(num_str) * unit_seconds[unit]
        pos = match.end()

    if pos != len(compact):
        raise ValueError(f"invalid duration string: {s!r}")

    return total
```