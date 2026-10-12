business_days_between: end excluded, so while current < end. Also end <= start → 0. With end excluded and start included, if end <= start loop doesn't run... current < end with start >= end gives 0 too. But docstring says "If end <= start the result is 0" — with `current < end`, start < end required, fine.

Wait test: start Oct 5 (Monday), end Oct 12 (Monday). Excluding end: Oct 5-9 Mon-Fri = 5 business days. Correct.

add_business_days: must also skip holidays. Fix both.