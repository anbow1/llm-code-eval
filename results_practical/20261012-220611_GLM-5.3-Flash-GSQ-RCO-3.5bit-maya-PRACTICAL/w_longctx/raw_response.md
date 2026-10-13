```python
def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines) removed; dashes are kept.
    ' ab-12 x ' -> 'AB-12X'; 'ab-12\tx' -> 'AB-12X'; 'ab-12x\n' -> 'AB-12X'."""
    return "".join(raw.split()).upper()


def normalize_sku_legacy(raw: str) -> str:
    """Old format kept for the archive importer: upper-case, spaces turned into dashes."""
    return "-".join(raw.upper().split())


def find_product(catalog: dict, raw_sku: str):
    """Look a product up by any spelling of its SKU; catalog keys are canonical SKUs. None if missing."""
    return catalog.get(normalize_sku(raw_sku))
```