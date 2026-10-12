"""Order processing helpers.

lines: CSV-like strings 'order_id;customer;amount;currency;status'.
Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.
Only status 'paid' counts; 'refunded' subtracts the amount; anything else is rejected.
Blank lines and lines starting with '#' are skipped (not rejected). Line numbers start at 1.
"""

RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
_STATUSES = ("paid", "refunded")


def to_pln(amount, currency):
    """Convert a positive amount to PLN; raise ValueError for an unknown currency."""
    try:
        return amount * RATES[currency]
    except KeyError:
        raise ValueError("unknown currency: {!r}".format(currency))


def parse_line(raw):
    """Return (order_id, customer, amount_pln, status) for a valid line.

    Return None for blank or comment lines; raise ValueError for an invalid line.
    """
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("expected 5 fields")
    order_id, customer, amount, currency, status = parts
    if not order_id or not customer or status not in _STATUSES:
        raise ValueError("invalid order_id, customer or status")
    value = float(amount.replace(",", "."))
    if value < 0:
        raise ValueError("negative amount")
    return order_id, customer, to_pln(value, currency), status


def summarize(records):
    """Build the result dict from a list of (customer, signed_amount_pln) pairs."""
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}}


def process_orders(lines):
    """Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}."""
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            record = parse_line(raw)
        except ValueError:
            rejected.append(n); continue
        if record is None:
            continue
        _, customer, amount_pln, status = record
        records.append((customer, amount_pln if status == "paid" else -amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
