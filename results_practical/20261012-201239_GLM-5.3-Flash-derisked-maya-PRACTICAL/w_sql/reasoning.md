Orders in 2026: WHERE ordered_at LIKE '2026%' or substr(ordered_at,1,4)='2026'.

top_customers: join customers, orders (paid, 2026), order_items, sum, group by customers.id, order by revenue desc, name.

monthly_revenue: substr(ordered_at,1,7) month.

never_paid: customers with no paid order — NOT EXISTS.

avg_items_per_order: average of per-order total qty. Need subquery: per paid order sum(qty), join to customer for country, then avg over orders per country. Round.

Ordering: "by country" ambiguous—probably ORDER BY country.