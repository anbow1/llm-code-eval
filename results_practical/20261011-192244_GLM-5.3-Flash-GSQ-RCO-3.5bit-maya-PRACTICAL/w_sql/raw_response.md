```python
QUERIES = {
    "top_customers": """
        SELECT c.name AS name,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at >= '2026-01-01'
          AND o.ordered_at < '2027-01-01'
        GROUP BY c.id, c.name
        ORDER BY revenue DESC, c.name ASC
        LIMIT 3
    """,

    "monthly_revenue": """
        SELECT substr(o.ordered_at, 1, 7) AS month,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at >= '2026-01-01'
          AND o.ordered_at < '2027-01-01'
        GROUP BY month
        ORDER BY month ASC
    """,

    "never_paid": """
        SELECT c.name AS name
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
        SELECT c.country AS country,
               ROUND(AVG(order_totals.total_qty), 2) AS avg_items
        FROM (
            SELECT o.id AS order_id,
                   o.customer_id AS customer_id,
                   SUM(oi.qty) AS total_qty
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'paid'
            GROUP BY o.id, o.customer_id
        ) AS order_totals
        JOIN customers c ON c.id = order_totals.customer_id
        GROUP BY c.country
        ORDER BY c.country ASC
    """,
}
```