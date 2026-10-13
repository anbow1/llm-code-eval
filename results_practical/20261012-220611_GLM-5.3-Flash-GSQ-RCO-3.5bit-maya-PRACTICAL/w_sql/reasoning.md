Let me write the SQL queries carefully.

Revenue = sum(qty*unit_price) over items of paid orders, filtered by year 2026 (ordered_at LIKE '2026-%').

top_customers:
```sql
SELECT c.name, ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id AND o.status = 'paid' AND o.ordered_at LIKE '2026-%'
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id, c.name
ORDER BY revenue DESC, c.name
LIMIT 3
```
Order by revenue DESC — but revenue is rounded; ordering should be on actual revenue? Ties by name. Better order by SUM(...) DESC, c.name. Ordering by rounded vs unrounded could differ; safer to order by SUM(qty*unit_price) DESC. But column named revenue rounded. I'll use ORDER BY SUM(oi.qty*oi.unit_price) DESC, c.name.

monthly_revenue:
```sql
SELECT substr(o.ordered_at, 1, 7) AS month, ROUND(SUM(oi.qty*oi.unit_price), 2) AS revenue
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status='paid' AND o.ordered_at LIKE '2026-%'
GROUP BY month ORDER BY month
```

never_paid:
```sql
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id=c.id AND o.status='paid')
ORDER BY c.name
```

avg_items_per_order: average sum of qty per paid order per country. Paid orders — presumably any year? "per paid order, per country" — no year restriction. So:
```sql
SELECT c.country, ROUND(AVG(t.total_qty), 2) AS avg_items
FROM (
  SELECT o.customer_id, SUM(oi.qty) AS total_qty
  FROM orders o JOIN order_items oi ON oi.order_id=o.id
  WHERE o.status='paid'
  GROUP BY o.id
) t
JOIN customers c ON c.id = t.customer_id
GROUP BY c.country
ORDER BY c.country
```

Customers with paid orders but no items? If a paid order has no items, sum is 0; it would appear in the subquery if we GROUP BY o.id with JOIN — no, inner join excludes orders without items. Should orders with no items count? Ambiguous; inner join is fine. Alternatively LEFT JOIN to include zero. I'll use LEFT JOIN with COALESCE? Simpler: keep inner join.

Module with QUERIES dict, strings as constants.