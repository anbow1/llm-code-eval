Refactor into helpers. parse_line returns tuple (order_id, customer, amount_pln? No—amount raw?). parse_line returns (order_id, customer, amount_pln, status)? Wait: parse_line returns tuple (order_id, customer, amount_pln, status) — but conversion to PLN is in to_pln. Hmm, the spec says parse_line returns amount_pln... Actually it says "(order_id, customer, amount_pln, status)" — but then to_pln converts. Probably parse_line returns raw amount as float (parsed, not converted), and to_pln does conversion. Let me interpret: parse_line returns (order_id, customer, amount, status) where amount is the parsed float; to_pln converts. The spec literally says amount_pln but that would make to_pln redundant. To keep behaviour, I'll parse amount in parse_line (validated, non-negative, comma→dot) and to_pln(amount, currency) converts. I'll name it amount in the tuple to be safe? The instructions say amount_pln — but that conflicts. I'll follow literal: parse_line returns amount as float (pre-conversion). Hmm, tests would check behaviour of process_orders only presumably. I'll return amount (unconverted) since to_pln does conversion. Actually to satisfy both, maybe parse_line returns amount_pln where PLN-specific... no. I'll go with parse_line returning the parsed amount, and note in docstring. Better: follow the spec naming: return amount (float). I'll just do it cleanly.

Edge: empty customer/order_id check. float parse error → ValueError from float. Negative → ValueError. Unknown currency → ValueError in to_pln. Invalid status — where? Could be in parse_line? Status validation: paid/refunded sign. Put status check in process_orders or parse_line raising ValueError? parse_line returns status; sign determination could be in process_orders or a helper. Keep in process_orders: sign = 1 if status=="paid" else -1 if refunded else reject. That keeps ≤15 lines.

parse_line:

```python
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
        raise ValueError("invalid order")
    return (order_id, customer, value, status)
```

Wait currency needed for to_pln but parse_line returns only 4 fields without currency. Then to_pln(amount, currency) needs currency — process_orders must have currency. Hmm. parse_line returns (order_id, customer, amount_pln, status) — 4 fields, currency omitted. Then process_orders can't call to_pln without currency... unless parse_line is supposed to... Contradiction in the spec. Perhaps parse_line should return currency too? Or the tuple should be 5 fields. To use to_pln, process_orders needs currency. Options: parse_line returns 5-tuple. But spec says 4-tuple. Maybe parse_line internally... could return (order_id, customer, amount_pln, status) where to_pln already applied? Then to_pln is used inside parse_line — but parse_line doesn't take currency... it has it from parts. So parse_line could call to_pln(value, currency) internally! That works: parse_line splits, parses amount, converts via to_pln (raising ValueError for unknown currency), returns (order_id, customer, amount_pln, status). Then process_orders:

```python
def process_orders(lines):
    total = 0.0
    by_customer = {}
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
            sign = 1
        elif status == "refunded":
            sign = -1
        else:
            rejected.append(n)
            continue
        signed = sign * amount_pln
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": rejected}
```

That's ~22 lines. Need ≤15. Move status→sign into summarize? summarize takes (customer, signed_amount_pln) pairs. So sign determination must happen before. Could compute sign via dict: sign = {"paid": 1, "refunded": -1}.get(status); if sign is None: reject. Compact:

```python
def process_orders(lines):
    total, by_customer, rejected = 0.0, {}, []
    signs = {"paid": 1, "refunded": -1}
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _, customer, amount_pln, status = parsed
        if status not in signs:
            rejected.append(n)
            continue
        signed = signs[status] * amount_pln
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return summarize([(c, signs[s] * a) ...])
```

Better: build records list then call summarize. Lines:

```python
def process_orders(lines):
    signs = {"paid": 1, "refunded": -1}
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
        _, customer, amount_pln, status = parsed
        if status not in signs:
            rejected.append(n)
            continue
        records.append((customer, signs[status] * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```

That's 19 lines including return spanning. Count actual lines: def(1), signs(2), records(3), rejected(4), for(5), try(6), except(7), append(8), continue(9), if None(10), continue(11), unpack(12), if status not in(13), append(14), continue(15), records.append(16), result(17), result["rejected"](18), return(19). Slightly over 15. Could compact: use single if:

```python
if parsed is None: continue
```
and combine. Or move status check into parse_line? parse_line returns status — spec says it returns status, so status validation stays in caller. Compact version:

```python
def process_orders(lines):
    signs = {"paid": 1, "refunded": -1}
    records, rejected = [], []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n); continue
        if parsed is None:
            continue
        _, customer, amount_pln, status = parsed
        if status in signs:
            records.append((customer, signs[status] * amount_pln))
        else:
            rejected.append(n)
    result = summarize(records)
    result["rejected"] = rejected
    return result
```

That's 16 lines. Hmm. Compact: `if parsed is None: continue` on one line. Count: 1 def, 2 signs, 3 records/rejected, 4 for, 5 try, 6 except, 7 except body, 8 if parsed is None: continue, 9 unpack, 10 if status in signs, 11 append else... use else block: 12 else rejected.append. Actually:

```python
        if status in signs:
            records.append((customer, signs[status] * amount_pln))
        else:
            rejected.append(n)
```
4 lines. Total: 1+1+1+1+ (try 1, except 1, body 1) + 1 + 1 + 4 + 1 summarize + 1 result rejected + 1 return = 15. Good, exactly 15. Or use result = summarize(...); result["rejected"] = rejected; return result — 3 lines. Alternatively summarize could accept rejected? No, spec fixed.

Alternative to save lines: rejected handling via try/except else:

```python
        try:
            parsed = parse_line(raw)
            if parsed is None:
                continue
        except ValueError:
            rejected.append(n)
            continue
```
No, continue inside try is fine but same count. Keep 15.

Actually could reduce: put `result["rejected"] = rejected` and return — fine.

Write helpers:

to_pln:
```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}

def to_pln(amount, currency):
    try:
        rate = RATES[currency]
    except KeyError:
        raise ValueError("unknown currency: %r" % (currency,))
    return amount * rate
```

parse_line calls to_pln.

summarize:
```python
def summarize(records):
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}}
```

Then process_orders adds rejected. Fine — result dict keys: total_pln, by_customer, rejected. Adding rejected key preserves order? Dict key order: total_pln, by_customer, then rejected added — same as original. Good.

Include docstrings.