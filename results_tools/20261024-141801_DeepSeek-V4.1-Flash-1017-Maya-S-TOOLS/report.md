# DeepSeek-V4.1-Flash-1017-Maya-S-TOOLS

- Date: 2026-10-24 14:21
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 32768, think default, effort high)
- Total time: 3.5 min (generation 3.5 min)
- Tokens: 1853 total, 585 of them thinking
- Speed: 22.5 tok/s decode, first token after 9.4 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 172.1 GB (at start 171.9 GB) | Disk read: 0.1 GB
- Tasks: 7/7 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Tool calling | 100.0% |
| **Overall** | **100.0%** |
| Only tasks it finished | 100.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t_select | 100% | ok | 17.7 | 119 | 42 | 23.0 |
| t_args | 100% | ok | 19.4 | 157 | 0 | 22.7 |
| t_chain | 100% | ok | 42.5 | 372 | 198 | 24.2 |
| t_parallel | 100% | ok | 21.3 | 177 | 0 | 23.9 |
| t_error | 100% | ok | 33.3 | 333 | 132 | 22.3 |
| t_no_tool | 100% | ok | 10.3 | 15 | 14 | 20.9 |
| t_agent_fix | 100% | ok | 63.1 | 680 | 199 | 20.7 |

## t_select — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS used_get_shipping_status
- PASS no_write_tools
- PASS at_most_2_calls
- PASS answer_has_status
- PASS gave_final_answer
  - note: tool calls: 1 in 2 model turns

## t_args — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS exactly_one_ticket
- PASS priority_urgent
- PASS due_date_2026_10_16
- PASS customer_id_int_314
- PASS tags_mobile_payments
- PASS short_relevant_title
- PASS no_other_writes
- PASS answer_has_ticket_id
- PASS gave_final_answer
  - note: tool calls: 1 in 2 model turns

## t_chain — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS looked_up_customer_207
- PASS exactly_one_refund
- PASS refunded_latest_order
- PASS full_amount
- PASS reason_damaged
- PASS answer_has_refund_id
- PASS gave_final_answer
  - note: tool calls: 4 in 5 model turns

## t_parallel — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS fetched_all_three
- PASS parallel_calls
- PASS at_most_3_model_turns
- PASS no_write_tools
- PASS answer_covers_all
- PASS gave_final_answer
  - note: tool calls: 3 in 2 model turns

## t_error — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS retried_after_503
- PASS at_most_4_rate_calls
- PASS correct_amount_1067_50
- PASS says_order_not_found
- PASS no_invented_status
- PASS no_write_tools
- PASS gave_final_answer
  - note: tool calls: 3 in 3 model turns

## t_no_tool — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS no_tool_calls
- PASS correct_391
- PASS short_answer
- PASS gave_final_answer
  - note: tool calls: 0 in 1 model turns

## t_agent_fix — 100%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS visible_tests_pass
- PASS hidden_tests_pass
- PASS tests_not_modified
- PASS ran_tests_after_last_edit
- PASS at_most_12_tool_calls
- PASS gave_final_answer
  - note: tool calls: 5 in 5 model turns
