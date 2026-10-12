Split into helpers. parse_line validates parts, amount, currency via to_pln, status sign? Actually parse_line returns (order_id, customer, amount_pln, status). to_pln converts currency. So parse_line uses to_pln? It needs to call to_pln for conversion. Then process_orders applies sign based on status, and rejects lines with bad status. But status invalid → rejected, not ValueError. So parse_line returns status raw, and process_orders checks status.

Wait: unknown currency raises ValueError (rejected). Invalid line raises ValueError. Negative value → invalid? In original, value<0 or missing customer/order_id → rejected. Should that be ValueError from parse_line? Yes, parse_line should raise ValueError for those. But then process_orders catches ValueError to reject.

Note ordering: original checks status after currency; both lead to rejected, order doesn't matter. But ValueError message not used, so fine.

parse_line:
- strip; blank/comment → None
- split, must be 5 parts else ValueError
- order_id, customer, amount, currency, status
- float parse with comma replacement; ValueError if fails
- value<0 or not customer or not order_id → ValueError
- amount_pln = to_pln(value, currency)
- return (order_id, customer, amount_pln, status)

process_orders: loop, try parse_line, except ValueError reject. status check: paid/refunded, else reject. Then summarize.

summarize(records): list of (customer, signed_amount). Build dict with total and by_customer rounded.