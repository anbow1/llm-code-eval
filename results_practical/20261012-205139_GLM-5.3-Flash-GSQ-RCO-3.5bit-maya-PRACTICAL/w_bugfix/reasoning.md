Test: business_days_between(Oct 5, Oct 12) — start included, end excluded, so days Oct 5..11: Mon-Fri = 5,9,10,11? Wait Oct 5 2026 is Monday. Oct 5,6,7,8,9 = 5 business days, Oct 10-11 weekend, Oct 12 excluded. Loop `while current <= end` includes end → 6. Fix: `while current < end`.

add_business_days: holiday not skipped. Fix: check holidays.