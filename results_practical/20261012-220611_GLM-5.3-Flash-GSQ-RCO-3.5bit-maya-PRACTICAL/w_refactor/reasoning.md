Refactor into helpers. parse_line returns tuple (order_id, customer, amount_pln? — actually amount and currency need conversion). Spec: parse_line returns (order_id, customer, amount_pln, status)? Wait it says (order_id, customer, amount_pln, status) — but conversion happens in to_pln(amount, currency). Hmm, amount_pln... Actually parse_line probably returns (order_id, customer, amount, currency, status)? No — spec says 4-tuple. But then to_pln(amount, currency) converts. Conflict: if parse_line returns amount_pln already converted, to_pln wouldn't be needed. But maybe parse_line returns (order_id, customer, amount, currency) plus status? Spec: "returns a tuple (order_id, customer, amount_pln, status)". Perhaps parse_line returns raw amount parsed (float, validated) but currency conversion via to_pln inside process_orders? But then to_pln needs currency. Hmm.

Alternative reading: parse_line returns (order_id, customer, amount, currency, status)? No, it explicitly lists four names with amount_pln. Maybe the intended design: parse_line parses and validates (5 fields, float parse, value >=0, customer/order_id non-empty, known status? no — status validity handled where?). Status rejection must mark line rejected. Where does status check happen? parse_line could raise ValueError for invalid status too? But then rejected line numbers still same. Actually parse_line raising ValueError → line rejected. So parse_line can handle: wrong field count, float parse fail, negative value, empty customer/order_id, and... status? But to_pln handles currency unknown. So parse_line must return currency somehow for to_pln to work. Unless parse_line does conversion itself using to_pln: parse_line calls to_pln(amount, currency) → returns amount_pln. But then status check: parse_line could raise ValueError for invalid status? But the docstring for parse_line says raises ValueError for invalid line — status invalid counts as invalid line. But then signed amount? summarize takes (customer, signed_amount_pln) pairs — sign applied in process_orders based on status. So parse_line returns status, process_orders applies sign. And parse_line returns amount_pln already converted via to_pln? But to_pln signature is to_pln(amount, currency) — so parse_line must extract currency before converting. Yes: parse_line splits, validates, calls to_pln(amount, currency) to get amount_pln, returns (order_id, customer, amount_pln, status). Unknown currency → ValueError from to_pln → rejected. Invalid status — where checked? Could be checked in process_orders or parse_line. Either way same rejected numbers. I'll check status in process_orders (or parse_line — simpler in process_orders). Actually keep in process_orders: if status paid sign 1, refunded -1, else rejected.

But careful: to_pln raising ValueError for unknown currency — parse_line lets it propagate. Fine.

Write:

def to_pln(amount, currency):
    rates = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
    if currency not in rates:
        raise ValueError(...)
    return amount * rates[currency]

def parse_line(raw):
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("expected 5 fields")
    order_id, customer, amount, currency, status = parts
    try:
        value = float(amount.replace(",", "."))
    except ValueError:
        raise ValueError("invalid amount")
    if value < 0 or not customer or not order_id:
        raise ValueError("invalid data")
    return order_id, customer, to_pln(value, currency), status

def summarize(records):
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total,2), "by_customer": {k: round(v,2) for k,v in sorted(by_customer.items())}}

def process_orders(lines):
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
        order_id, customer, amount_pln, status = parsed
        if status == "paid":
            records.append((customer, amount_pln))
        elif status == "refunded":
            records.append((customer, -amount_pln))
        else:
            rejected.append(n)
    result = summarize(records)
    result["rejected"] = rejected
    return result

Count lines: ~14. Good. Note: order_id unused but returned per spec — fine (could use _). Keep.