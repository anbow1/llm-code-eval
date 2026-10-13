Bugs: business_days_between includes end (should be exclusive) — loop `current < end`. Test: start Oct 5 (Mon), end Oct 12 (Mon). Exclusive end: Oct 5,6,7,8,9 = 5 business days. Correct.

add_business_days: doesn't check holidays. Also check holiday in loop. Also holidays membership — holidays may be a set; fine.