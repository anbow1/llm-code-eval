```python
def parse_line(raw):
    """Parse one CSV-like line. Returns (order_id, customer, amount_pln, status),
    or None for blank/comment lines. Raises ValueError for invalid lines."""
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("wrong number of fields")
    order_id, customer, amount, currency, status = parts
    if not customer or not order_id:
        raise ValueError("missing order_id or customer")
    value = float(amount.replace(",", "."))
    if value < 0:
        raise ValueError("negative amount")
    if status not in ("paid", "refunded"):
        raise ValueError("unknown status")
    return (order_id, customer, to_pln(value, currency), status)


def to_pln(amount, currency):
    """Convert an amount to PLN. Raises ValueError for an unknown currency."""
    rates = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
    if currency not in rates:
        raise ValueError("unknown currency: %s" % currency)
    return amount * rates[currency]


def summarize(records):
    """Build the result dict from a list of (customer, signed_amount_pln) pairs."""
    total = 0.0
    by_customer = {}
    for customer, amount in records:
        total += amount
        by_customer[customer] = by_customer.get(customer, 0.0) + amount
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}}


def process_orders(lines):
    """lines: CSV-like strings 'order_id;customer;amount;currency;status'.

    Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}.
    Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.
    Only status 'paid' counts; 'refunded' subtracts the amount; anything else is rejected.
    Blank lines and lines starting with '#' are skipped (not rejected). Line numbers start at 1.
    """
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _order_id, customer, amount_pln, status = parsed
        sign = 1 if status == "paid" else -1
        records.append((customer, sign * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```