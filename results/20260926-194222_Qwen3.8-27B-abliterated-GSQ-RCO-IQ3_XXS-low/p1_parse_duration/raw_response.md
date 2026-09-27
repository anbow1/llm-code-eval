```python
import re

def parse_duration(s: str) -> int:
    stripped = s.strip()
    
    if not stripped:
        raise ValueError("Empty or blank string")
    
    if not re.fullmatch(r'\d+[dhms]( *\d+[dhms])*', stripped):
        raise ValueError(f"Invalid duration: '{s}'")
    
    parts = re.findall(r'(\d+)([dhms])', stripped)
    
    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    
    prev_order = -1
    total = 0
    for num, unit in parts:
        order = unit_order[unit]
        if order <= prev_order:
            raise ValueError(f"Wrong unit order or repeated unit in: '{s}'")
        prev_order = order
        total += int(num) * unit_seconds[unit]
    
    return total
```