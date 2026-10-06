```python
import re

_DUR_RE = re.compile(r'^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$')

_UNITS = (('d', 86400), ('h', 3600), ('m', 60), ('s', 1))

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty duration")
    parts = s.split()
    seen = []
    total = 0
    for part in parts:
        m = re.fullmatch(r'(\d+)([dhms])', part)
        if not m:
            raise ValueError(f"invalid part: {part!r}")
        unit = m.group(2)
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        seen.append(unit)
        total += int(m.group(1)) * dict(_UNITS)[unit]
    # enforce order according to the canonical unit sequence
    order = ['d', 'h', 'm', 's']
    indices = [order.index(u) for u in seen]
    if indices != sorted(indices):
        raise ValueError("wrong order")
    return total
```

Wait — this uses a single `re.fullmatch` per part, which is valid. However, note the top-level `_DUR_RE` is unused; here is the cleaned version:

```python
import re

_UNITS = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
_ORDER = ['d', 'h', 'm', 's']
_PART_RE = re.compile(r'(\d+)([dhms])')

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty duration string")
    seen = set()
    last = -1
    total = 0
    for part in s.split():
        m = _PART_RE.fullmatch(part)
        if not m:
            raise ValueError(f"invalid part: {part!r}")
        num, unit = m.groups()
        if unit in seen:
            raise ValueError(f"repeated unit: {unit}")
        idx = _ORDER.index(unit)
        if idx <= last:
            raise ValueError("wrong unit order")
        seen.add(unit)
        last = idx
        total += int(num) * _UNITS[unit]
    return total
```