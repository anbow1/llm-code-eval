The schema: order_items has multiple rows per order. Need DISTINCT order when summing qty*unit_price joined with customers... For top_customers, revenue = sum over paid orders of sum(qty*unit_price). Joining customers to orders to items is fine since items aggregate per order — summing qty*unit_price across all rows works directly, no join multiplication because customers→orders→items is 1:N and we sum item rows. Yes, direct sum works.

top_customers: customers with revenue in 2026, paid orders only, top 3, ties by name. Should we include customers with 0 revenue? "highest revenue in 2026" — only those with paid orders have revenue. Order by revenue DESC, name ASC LIMIT 3.

monthly_revenue: strftime('%Y-%m', ordered_at), year 2026, paid.

never_paid: customers with no paid order. Use NOT EXISTS (paid order) — customers with no orders included. LEFT JOIN with condition, or NOT IN subquery. NOT EXISTS is safest.

avg_items_per_order: per country, average over paid orders of (sum of qty per order). Need per-order total qty, then average per country. Use subquery computing total qty per paid order, group by country averaging. Or SUM(qty)/COUNT(DISTINCT orders.id) — since each item row belongs to one order, total qty / number of distinct orders = average. That works: SUM(qty) over all paid item rows grouped by country, divided by COUNT(DISTINCT orders.id) grouped by country. Yes.