```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank duration string")
    if re.search(r"\s", s):
        parts = s.split()
    else:
        parts = [s]
    order = {"d": 0, "h": 1, "m": 2, "s": 3}
    multipliers = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    seen = []
    total = 0
    for part in parts:
        m = re.fullmatch(r"(0|[1-9]\d*)([dhms])", part)
        if not m:
            raise ValueError(f"invalid part: {part!r}")
        num, unit = int(m.group(1)), m.group(2)
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        if seen and order[unit] <= order[seen[-1]]:
            raise ValueError(f"unit out of order: {unit}")
        seen.append(unit)
        total += num * multipliers[unit]
    return total
```