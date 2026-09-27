

```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    matches = re.findall(r'\d+[dhms]', s)
    non_space = s.replace(' ', '')
    if non_space != ''.join(matches):
        raise ValueError("invalid format")

    parts = [(int(m[:-1]), m[-1]) for m in matches]

    order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    prev = -1
    for _, unit in parts:
        idx = order[unit]
        if idx <= prev:
            raise ValueError("wrong order or repeated unit")
        prev = idx

    values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    return sum(n * values[u] for n, u in parts)
```