```python
def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines, etc.) removed; dashes are kept.
    ' ab-12 x ' -> 'AB-12X', 'ab-12\\tx' -> 'AB-12X', 'ab-12x\\n' -> 'AB-12X'."""
    # raw.split() with no arguments splits on any run of whitespace (space, tab,
    # newline, carriage return, vertical tab, form feed), so a pasted SKU with a
    # tab or trailing newline is cleaned just like one typed with plain spaces.
    return "".join(raw.split()).upper()


def find_product(catalog: dict, raw_sku: str):
    """Look a product up by any spelling of its SKU; catalog keys are canonical SKUs. None if missing."""
    return catalog.get(normalize_sku(raw_sku))
```