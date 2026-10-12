Bugs: business_days_between loop should be `current < end` (end excluded). Also should handle end <= start returning 0 — with `current < end` that works since start >= end means no iterations.

add_business_days must skip holidays too: check `current not in holidays`.