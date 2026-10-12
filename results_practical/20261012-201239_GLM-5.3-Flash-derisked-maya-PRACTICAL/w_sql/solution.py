# QUERIES: named SQL queries used for revenue reporting.

QUERIES = {
    # 3 customers with the highest revenue (paid orders only) in 2026.
    "top_customers": """
        SELECT c.name,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM customers c
        JOIN orders o        ON o.customer_id = c.id
        JOIN order_items oi  ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND substr(o.ordered_at, 1, 4) = '2026'
        GROUP BY c.id, c.name
        ORDER BY revenue DESC, c.name
        LIMIT 3
    """,

    # Revenue per month in 2026, only months that have any revenue.
    "monthly_revenue": """
        SELECT substr(o.ordered_at, 1, 7) AS month,
               ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND substr(o.ordered_at, 1, 4) = '2026'
        GROUP BY month
        HAVING SUM(oi.qty * oi.unit_price) != 0
        ORDER BY month
    """,

    # Customers who never placed a paid order (including those with no orders).
    "never_paid": """
        SELECT c.name
        FROM customers c
        WHERE NOT EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.customer_id = c.id
              AND o.status = 'paid'
        )
        ORDER BY c.name
    """,

    # Average number of items (sum of qty) per paid order, by customer country.
    "avg_items_per_order": """
        SELECT c.country,
               ROUND(AVG(order_qty), 2) AS avg_items
        FROM (
            SELECT o.id, o.customer_id, SUM(oi.qty) AS order_qty
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'paid'
            GROUP BY o.id
        ) t
        JOIN customers c ON c.id = t.customer_id
        GROUP BY c.country
        ORDER BY c.country
    """,
}
