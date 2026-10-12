The user wants a Python module defining a QUERIES dict with SQL strings for SQLite.

- top_customers: 3 customers with highest revenue in 2026, paid orders, join order_items, sum qty*unit_price, name, revenue round 2, order by revenue desc, name asc, limit 3.
- monthly_revenue: strftime('%Y-%m', ordered_at) as month, revenue, where status='paid' and year 2026, group by month, having revenue > 0? "only months with revenue" — group by automatically excludes months without orders. Order by month.
- never_paid: customers with no paid order; NOT EXISTS or NOT IN. Use NOT EXISTS for safety with NULLs.
- avg_items_per_order: per country, average of total qty per paid order. Need per-order sums then average per country. Since each order has one customer → one country. Use join orders + order_items grouped by order then average.

Write SQL:

```sql
SELECT c.name, ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'paid' AND strftime('%Y', o.ordered_at) = '2026'
GROUP BY c.id, c.name
ORDER BY revenue DESC, c.name
LIMIT 3
```

Hmm, ORDER BY revenue DESC — but revenue is rounded; ties by name fine.

monthly_revenue:

```sql
SELECT strftime('%Y-%m', o.ordered_at) AS month,
       ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'paid' AND strftime('%Y', o.ordered_at) = '2026'
GROUP BY month
ORDER BY month
```

never_paid:

```sql
SELECT c.name
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'paid'
)
ORDER BY c.name
```

avg_items_per_order:

```sql
SELECT c.country,
       ROUND(AVG(total_qty), 2) AS avg_items
FROM (
  SELECT o.id, SUM(oi.qty) AS total_qty
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status = 'paid'
  GROUP BY o.id
) t
JOIN customers c ON c.id = (SELECT customer_id FROM orders WHERE id = t.id)
GROUP BY c.country
ORDER BY c.country
```

Simpler: join orders in subquery with customer_id. Subquery: SELECT o.customer_id, SUM(oi.qty) total_qty FROM orders o JOIN order_items ... WHERE paid GROUP BY o.id, o.customer_id. Then join customers.