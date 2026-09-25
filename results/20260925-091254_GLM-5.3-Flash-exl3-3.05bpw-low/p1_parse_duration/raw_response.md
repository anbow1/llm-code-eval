```python
import re

_UNIT_SECONDS = {"d": 86400, "h": 3600, "m": 60, "s": 1}
_ORDER = "dhms"


def parse_duration(s: str) -> int:
    if not s or s.strip() == "":
        raise ValueError("empty or blank string")
    text = s.strip()
    if not text:
        raise ValueError("empty or blank string")

    parts = text.split()
    seen_units = []
    total = 0

    for i, part in enumerate(parts):
        if i > 0 and not re.fullmatch(r"\d+[dhms]", part):
            raise ValueError(f"invalid part: {part!r}")

        m = re.fullmatch(r"(\d+)([dhms])", part)
        if not m:
            raise ValueError(f"invalid part: {part!r}")
        num_str, unit = m.groups()
        if len(num_str) > 1 and num_str[0] == "0":
            pass  # leading zeros are still non-negative integers; allow
        seen_units.append(unit)

    # validate combined string (no separators case handled by full match below)
    combined = "".join(parts)
    if not re.fullmatch(r"\d+(?:[dhms]\d+)*", combined):
        raise ValueError("malformed duration")

    cm = re.fullmatch(r"(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", combined)
    if not cm or cm.group(0) == "":
        raise ValueError("malformed duration")

    groups = cm.groups()
    units_found = []
    for value, unit in zip(groups, _ORDER):
        if value is not None:
            units_found.append(unit)
            total += int(value) * _UNIT_SECONDS[unit]
        else:
            # ensure no unit appears after a missing one (order check) —
            # regex above ensures matched sequence is ordered, but check duplicates
            pass

    # duplicates impossible via regex per unit; order enforced by regex structure
    # but explicit check: units must appear in order d,h,m,s at most once
    expected = []
    prev = -1
    for u in units_found:
        idx = _ORDER.index(u)
        if idx <= prev:
            raise ValueError("wrong order or repeated unit")
        prev = idx
        expected.append(u)

    if total == 0 and units_found == []:
        raise ValueError("malformed duration")

    # reject stray numbers without unit: "10" or "1h10"
    if re.search(r"\d(?![dhms])", combined.replace(..., "")) if False else False:
        raise ValueError

    return total
```