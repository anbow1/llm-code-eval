"""Warehouse inventory helpers."""
import csv
from dataclasses import dataclass


@dataclass
class Item:
    sku: str
    name: str
    category: str
    qty: int
    unit_price: float


def load_items(path):
    """Read items from a CSV file with columns sku,name,category,qty,unit_price."""
    items = []
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            items.append(Item(row["sku"], row["name"], row["category"], int(row["qty"]),
                              float(row["unit_price"])))
    return items


def total_value(items):
    """Value of the whole stock."""
    return round(sum(i.qty * i.unit_price for i in items), 2)


def low_stock(items, threshold=5, category=None):
    """SKUs whose quantity is below the threshold, sorted. Optionally filter by category."""
    candidates = items if category is None else (i for i in items if i.category == category)
    return sorted(i.sku for i in candidates if i.qty < threshold)


def value_by_category(items):
    """Stock value (qty * unit_price) per category, rounded to 2 decimals."""
    values = {}
    for i in items:
        values[i.category] = values.get(i.category, 0.0) + i.qty * i.unit_price
    return {cat: round(val, 2) for cat, val in values.items()}


def format_report(items):
    """One line per item: SKU, name, quantity."""
    lines = [f"{i.sku:<8} {i.name:<20} {i.qty:>5}" for i in items]
    lines.append(f"TOTAL VALUE: {total_value(items):.2f}")
    return "\n".join(lines)
