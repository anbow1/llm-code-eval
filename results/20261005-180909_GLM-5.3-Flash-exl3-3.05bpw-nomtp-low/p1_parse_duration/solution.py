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
