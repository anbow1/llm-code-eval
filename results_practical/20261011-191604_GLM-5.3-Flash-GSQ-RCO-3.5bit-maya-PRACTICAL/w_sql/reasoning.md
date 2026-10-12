Careful with "top_customers": revenue in 2026 — presumably revenue from paid orders with ordered_at in 2026. Ties by name — ascending name presumably. monthly_revenue: only months with revenue, so GROUP BY strftime. avg_items_per_order: average sum of qty per paid order per country — need per-order sum of qty, then average per country. Paid orders only. Use subquery grouping by order.

never_paid: customers with no paid order at all — NOT EXISTS paid order (orders may exist but none paid, or no orders). Use NOT EXISTS.

Write module with QUERIES dict.