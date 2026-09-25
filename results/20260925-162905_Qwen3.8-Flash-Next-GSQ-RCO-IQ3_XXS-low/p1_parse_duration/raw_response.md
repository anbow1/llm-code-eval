```python
import re


def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank string")

    m = re.fullmatch(r'\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s\s*)?', s)
    if m is None:
        raise ValueError("invalid duration string")

    if all(m.group(i) is None for i in (1, 2, 3, 4)):
        raise ValueError("no duration parts found")

    total = 0
    if m.group(1) is not None:
        total += int(m.group(1)) * 86400
    if m.group(2) is not None:
        total += int(m.group(2)) * 3600
    if m.group(3) is not None:
        total += int(m.group(3)) * 60
    if m.group(4) is not None:
        total += int(m.group(4)) * 1

    return total
```