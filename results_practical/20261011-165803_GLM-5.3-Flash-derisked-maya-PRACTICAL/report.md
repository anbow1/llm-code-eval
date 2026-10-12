# GLM-5.3-Flash-derisked-maya-PRACTICAL

- Date: 2026-10-11 17:01
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 32768, think default, effort medium)
- Total time: 3.3 min (generation 3.3 min)
- Tokens: 3749 total, 1823 of them thinking
- Speed: 21.1 tok/s decode, first token after 3.5 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 101.5 GB (at start 101.2 GB) | Disk read: 0.0 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 99.2% |
| **Overall** | **99.2%** |
| Only tasks it finished | 99.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| w_edit | 100% | ok | 23.9 | 409 | 13 | 20.6 |
| w_bugfix | 100% | ok | 19.3 | 334 | 131 | 21.3 |
| w_refactor | 100% | ok | 95.3 | 1934 | 1276 | 21.1 |
| w_sql | 100% | ok | 34.5 | 692 | 338 | 22.4 |
| w_json | 95% | ok | 16.8 | 303 | 53 | 22.9 |
| w_longctx | 100% | ok | 6.6 | 77 | 12 | 18.2 |

## w_edit — 100%
- PASS low_stock default unchanged
- PASS low_stock category filter
- PASS low_stock unknown category
- PASS low_stock category=None means all
- PASS value_by_category
- PASS value_by_category empty
- PASS Item untouched
- PASS load_items untouched
- PASS total_value untouched
- PASS format_report untouched
- PASS load_items still works

## w_bugfix — 100%
- PASS test_week (shown)
- PASS test_add_skips_holiday (shown)
- PASS friday to monday
- PASS same day
- PASS end before start
- PASS holidays
- PASS add over weekend
- PASS add zero
- PASS add over holidays and weekend

## w_refactor — 100%
- PASS same results on 43 inputs
- PASS has parse_line
- PASS has to_pln
- PASS has summarize
- PASS to_pln
- PASS parse_line
- PASS process_orders is short

## w_sql — 100%
- PASS top_customers
- PASS monthly_revenue
- PASS never_paid
- PASS avg_items_per_order

## w_json — 95%
- PASS array of 6 records
- PASS every record matches the schema
- PASS #1 order_id
- PASS #1 issue
- PASS #1 urgent
- PASS #2 order_id
- PASS #2 issue
- PASS #2 urgent
- PASS #3 order_id
- PASS #3 issue
- PASS #3 urgent
- PASS #4 order_id
- PASS #4 issue
- PASS #4 urgent
- PASS #5 order_id
- PASS #5 issue
- PASS #5 urgent
- PASS #6 order_id
- FAIL #6 issue
- PASS #6 urgent
- PASS customer names
  - note: #6 issue: AssertionError: late

## w_longctx — 100%
- PASS answer has a function
- PASS only existing functions returned
- PASS find_product('ab-12\tx')
- PASS find_product('ab-12x\n')
- PASS find_product(' ab-12 x ')
- PASS find_product('AB-12X')
- PASS find_product('a b-1 2\t\tx')
- PASS find_product('zz-1\r\n')
- PASS missing SKU still None
- PASS normalize_sku spec
- PASS legacy function unchanged

## Re-graded 2026-10-12

A test was fixed after this run; the saved answers were graded again: w_refactor 100% -> 86%, w_json 95% -> 100%. New overall: 97.6%.
