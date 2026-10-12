```python
QUERIES = {
    "top_customers": """
        SELECT c.name,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at LIKE '2026-%'
        GROUP BY c.id, c.name
        ORDER BY revenue DESC, c.name ASC
        LIMIT 3
    """,

    "monthly_revenue": """
        SELECT strftime('%Y-%m', o.ordered_at) AS month,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at LIKE '2026-%'
        GROUP BY month
        ORDER BY month ASC
    """,

    "never_paid": """
        SELECT c.name
        FROM customers c
        WHERE NOT EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.customer_id = c.id
              AND o.status = 'paid'
        )
        ORDER BY c.name ASC
    """,

    "avg_items_per_order": """
        SELECT c.country,
               ROUND(SUM(oi.qty) * 1.0 / COUNT(DISTINCT o.id), 2) AS avg_items
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
        GROUP BY c.country
        ORDER BY c.country ASC
    """,
}
```