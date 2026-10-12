Implement helpers. parse_line returns (order_id, customer, amount_pln, status) for valid lines — wait, currency conversion happens in to_pln. parse_line returns amount... spec says parse_line returns tuple (order_id, customer, amount_pln, status). But currency conversion is separate. Hmm — parse_line must parse fields; the amount and currency? Maybe parse_line returns amount in original currency plus currency? Spec says returns (order_id, customer, amount_pln, status). Perhaps parse_line calls to_pln internally. That's fine — parse_line raises ValueError for invalid line including unknown currency (to propagate). But careful: rejected lines are line numbers; parse_line raising ValueError causes rejection.

So:

def parse_line(raw):
    line = raw.strip()
    if not line or line.startswith("#"): return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5: raise ValueError
    order_id, customer, amount, currency, status = parts
    if not customer or not order_id: raise ValueError
    value = float(amount.replace(",", "."))
    if value < 0: raise ValueError
    if status not in ("paid","refunded"): raise ValueError
    amount_pln = to_pln(value, currency)
    return (order_id, customer, amount_pln, status)

to_pln:
def to_pln(amount, currency):
    rates = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
    try: rate = rates[currency]
    except KeyError: raise ValueError(...)
    return amount * rate

summarize(records): records = list of (customer, signed_amount_pln)
def summarize(records):
    total = 0.0; by_customer = {}
    for customer, amount in records:
        total += amount
        by_customer[customer] = by_customer.get(customer, 0.0) + amount
    return {"total_pln": round(total,2), "by_customer": {k: round(v,2) for k,v in sorted(by_customer.items())}}

process_orders:
def process_orders(lines):
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None: continue
        order_id, customer, amount_pln, status = parsed
        sign = 1 if status == "paid" else -1
        records.append((customer, sign * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result

That's ~14 lines. Good. Note float() raising ValueError handled.