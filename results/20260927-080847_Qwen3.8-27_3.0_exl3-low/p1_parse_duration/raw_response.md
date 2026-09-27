

```python
import re


def parse_duration(s: str) -> int:
    pattern = r'^\s*(\d+d)?(\s*\d+h)?(\s*\d+m)?(\s*\d+s)?\s*$'
    m = re.match(pattern, s)
    if not m:
        raise ValueError(f"Invalid duration: {s!r}")

    total = 0
    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    for i, unit in enumerate(['d', 'h', 'm', 's']):
        group = m.group(i + 1)
        if group:
            num_str = re.match(r'\s*(\d+)', group).group(1)
            total += int(num_str) * units[unit]

    return total
```