"""SQL queries for the customers / orders / order_items SQLite schema.

Revenue for an order is the sum of qty * unit_price over its items.
Only orders with status 'paid' count as revenue.
"""

QUERIES = {
    # Top 3 customers by total paid revenue in 2026 (highest first, ties by name).
    "top_customers": """
        SELECT
            c.name,
            ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM customers c
        JOIN orders o
            ON o.customer_id = c.id
           AND o.status = 'paid'
           AND o.ordered_at LIKE '2026-%'
        JOIN order_items oi
            ON oi.order_id = o.id
        GROUP BY c.id, c.name
        ORDER BY SUM(oi.qty * oi.unit_price) DESC, c.name
        LIMIT 3
    """,

    # Monthly paid revenue in 2026; only months that had revenue, in chronological order.
    "monthly_revenue": """
        SELECT
            substr(o.ordered_at, 1, 7) AS month,
            ROUND(SUM(oi.qty * oi.unit_price), 2) AS revenue
        FROM orders o
        JOIN order_items oi
            ON oi.order_id = o.id
        WHERE o.status = 'paid'
          AND o.ordered_at LIKE '2026-%'
        GROUP BY month
        ORDER BY month
    """,

    # Customers who never have any paid order (including customers with no orders).
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

    # Average total item quantity per paid order, grouped by customer country.
    "avg_items_per_order": """
        SELECT
            c.country,
            ROUND(AVG(t.total_qty), 2) AS avg_items
        FROM (
            SELECT
                o.id AS order_id,
                o.customer_id AS customer_id,
                SUM(oi.qty) AS total_qty
            FROM orders o
            JOIN order_items oi
                ON oi.order_id = o.id
            WHERE o.status = 'paid'
            GROUP BY o.id, o.customer_id
        ) t
        JOIN customers c
            ON c.id = t.customer_id
        GROUP BY c.country
        ORDER BY c.country
    """,
}
