```python
"""SQL queries for the customers / orders / order_items schema.

An order's value is the sum of qty * unit_price of its items.
Only 'paid' orders count as revenue.
"""

QUERIES = {
    # The 3 customers with the highest revenue in 2026 (paid orders only),
    # highest first, ties broken by name.
    "top_customers": """
        SELECT c.name,
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

    # Revenue per month in 2026 (paid orders only), only months with revenue,
    # sorted by month.
    "monthly_revenue": """
        SELECT strftime('%Y-%m', o.ordered_at) AS month,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at >= '2026-01-01'
          AND o.ordered_at < '2027-01-01'
        GROUP BY month
        ORDER BY month ASC
    """,

    # Customers who have no paid order at all (includes customers with no
    # orders), sorted by name.
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

    # Average number of items (sum of qty) per paid order, per country.
    # Items are aggregated per order first, then averaged per country.
    "avg_items_per_order": """
        SELECT c.country,
               ROUND(AVG(per_order.items), 2) AS avg_items
        FROM (
            SELECT o.id AS order_id,
                   o.customer_id,
                   SUM(oi.qty) AS items
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'paid'
            GROUP BY o.id, o.customer_id
        ) AS per_order
        JOIN customers c ON c.id = per_order.customer_id
        GROUP BY c.country
        ORDER BY c.country ASC
    """,
}
```