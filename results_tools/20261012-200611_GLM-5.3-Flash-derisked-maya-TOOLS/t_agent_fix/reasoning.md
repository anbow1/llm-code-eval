--- turn 1 ---
Let me look at the repo.

--- turn 3 ---
Discount is a fraction (0.25 = 25%), but code divides by 100. Fix: (1 - discount). Shipping: free for >= 200, code uses > 200. Fix both.

Check cart_total: line totals 100 + 40*0.5=20 → 120 subtotal, shipping 14.99 → 134.99. ✓