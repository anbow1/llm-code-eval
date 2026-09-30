

```python
import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    if not re.fullmatch(r"(\d+[dhms])(\s*\d+[dhms])*", s):
        raise ValueError(f"Invalid duration format: {s!r}")

    tokens = re.findall(r"\d+[dhms]", s)

    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    unit_order = {"d": 0, "h": 1, "m": 2, "s": 3}

    total = 0
    prev_order = -1

    for token in tokens:
        num_str = token[:-1]
        unit = token[-1]

        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Units out of order or repeated: {s!r}")
        prev_order = order

        total += int(num_str) * unit_seconds[unit]

    return total
```