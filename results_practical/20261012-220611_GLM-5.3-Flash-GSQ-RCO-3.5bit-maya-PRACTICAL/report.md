# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-PRACTICAL

- Date: 2026-10-12 22:10
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 32768, think default, effort high)
- Total time: 3.9 min (generation 3.9 min)
- Tokens: 4032 total, 1856 of them thinking
- Speed: 19.2 tok/s decode, first token after 5.6 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 118.0 GB (at start 117.2 GB) | Disk read: 40.9 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 97.6% |
| **Overall** | **97.6%** |
| Only tasks it finished | 97.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| w_edit | 100% | ok | 26.9 | 406 | 10 | 18.1 |
| w_bugfix | 100% | ok | 16.7 | 242 | 37 | 19.4 |
| w_refactor | 86% | ok | 87.3 | 1690 | 1058 | 20.4 |
| w_sql | 100% | ok | 57.0 | 1095 | 581 | 20.7 |
| w_json | 100% | ok | 23.1 | 395 | 145 | 20.8 |
| w_longctx | 100% | ok | 25.5 | 204 | 25 | 15.9 |

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

## w_refactor — 86%
- PASS same results on 43 inputs
- PASS has parse_line
- PASS has to_pln
- PASS has summarize
- PASS to_pln
- PASS parse_line
- FAIL process_orders is short
  - note: process_orders is short: AssertionError: process_orders body has 20 lines (max 15)

## w_sql — 100%
- PASS top_customers
- PASS monthly_revenue
- PASS never_paid
- PASS avg_items_per_order

## w_json — 100%
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
- PASS #6 issue
- PASS #6 urgent
- PASS customer names

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
