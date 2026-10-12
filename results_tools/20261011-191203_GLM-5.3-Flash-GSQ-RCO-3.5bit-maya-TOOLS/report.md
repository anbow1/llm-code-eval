# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-TOOLS

- Date: 2026-10-11 19:15
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 32768, think default, effort medium)
- Total time: 3.0 min (generation 3.0 min)
- Tokens: 1227 total, 232 of them thinking
- Speed: 14.6 tok/s decode, first token after 6.5 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 113.7 GB (at start 113.5 GB) | Disk read: 161.3 GB
- Tasks: 7/7 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Tool calling | 98.2% |
| **Overall** | **98.2%** |
| Only tasks it finished | 98.2% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| t_select | 100% | ok | 14.1 | 56 | 9 | 13.3 |
| t_args | 100% | ok | 16.6 | 87 | 7 | 13.7 |
| t_chain | 100% | ok | 28.3 | 157 | 55 | 15.5 |
| t_parallel | 100% | ok | 18.0 | 106 | 6 | 14.5 |
| t_error | 100% | ok | 25.2 | 178 | 33 | 15.5 |
| t_no_tool | 100% | ok | 7.2 | 11 | 9 | 16.1 |
| t_agent_fix | 88% | ok | 71.7 | 632 | 113 | 13.4 |

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
  - note: tool calls: 3 in 4 model turns

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

## t_agent_fix — 88%
- PASS tool_calls_well_formed
- PASS arguments_match_schema
- PASS visible_tests_pass
- PASS hidden_tests_pass
- FAIL tests_not_modified
- PASS ran_tests_after_last_edit
- PASS at_most_12_tool_calls
- PASS gave_final_answer
  - note: tool calls: 5 in 5 model turns
