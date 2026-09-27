```python
import re

def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")
    
    # Validate that the entire string is one or more parts (digits+unit) separated by optional whitespace
    full_pattern = r'^\d+[dhms](\s*\d+[dhms])*$'
    if not re.fullmatch(full_pattern, s):
        raise ValueError("invalid duration format")
    
    # Extract all parts
    parts = re.findall(r'\d+[dhms]', s)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    last_order = -1
    total = 0
    for part in parts:
        unit = part[-1]
        num = int(part[:-1])
        if unit_order[unit] <= last_order:
            raise ValueError("units out of order or repeated")
        last_order = unit_order[unit]
        total += num * unit_seconds[unit]
    
    return total
```