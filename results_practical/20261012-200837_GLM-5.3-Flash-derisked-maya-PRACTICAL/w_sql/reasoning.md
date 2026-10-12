I need to write SQL queries for each key.

Key subtleties:
- top_customers: 2026 paid orders, sum revenue, order by revenue desc, name asc, limit 3.
- monthly_revenue: strftime('%Y-%m', ordered_at) for 2026 paid orders, group by month, order by month.
- never_paid: customers with no paid order. Use NOT EXISTS or LEFT JOIN with status check. "no paid order at all" — so exclude customers who have any paid order. Use NOT EXISTS correlated subquery.
- avg_items_per_order: average of total qty per order, per country, paid orders. Sum qty per order, then average per country. Since an order can have multiple items, need per-order sum first, then avg. Could use AVG over subquery, or AVG(qty) would be wrong (mean per item line). Need AVG of per-order sums. Use subquery: SELECT customer_id, SUM(qty) as items FROM orders JOIN order_items ... WHERE status='paid' GROUP BY orders.id, then join customers, group by country.

Note "in 2026" — only top_customers and monthly_revenue specify 2026. never_paid and avg_items_per_order don't restrict to year.

never_paid: customers with no paid order at all — customers who have only cancelled/refunded or no orders. Use:

SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid') ORDER BY c.name;

avg_items_per_order:

SELECT c.country, ROUND(AVG(t.items), 2) AS avg_items
FROM (
  SELECT o.customer_id, SUM(oi.qty) AS items
  FROM orders o JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status = 'paid'
  GROUP BY o.id
) t JOIN customers c ON c.id = t.customer_id
GROUP BY c.country ORDER BY c.country;

Should customers with paid orders but no items be included? An order with no items — SUM over order_items join would exclude it. Ambiguous; probably fine. Could use LEFT JOIN but then SUM is NULL. Keep as is.

monthly_revenue: only months with revenue — GROUP BY handles that. Order by month string ascending works for YYYY-MM.

Write module.