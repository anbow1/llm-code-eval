business_days_between: end excluded, so while current < end. Also end <= start → 0. With end excluded and start included, if end <= start, loop with current < end gives 0 automatically. Check test: start=Oct 5 (Mon), end=Oct 12 (Mon). Business days Oct 5–9 = 5. With current < end: counts Oct 5-9 = 5. Correct.

add_business_days: need to skip holidays too. Fix: check weekday and not in holidays.