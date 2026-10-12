```python
def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines) removed; dashes are kept.
    ' ab-12 x ' -> 'AB-12X'."""
    return "".join(raw.upper().split())
```