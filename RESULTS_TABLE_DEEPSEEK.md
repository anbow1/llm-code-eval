# Results table: DeepSeek-V4

Every DeepSeek-V4 / V4.1 variant that has been run, in all four suites (`--preset ds4`). DeepSeek-V4-Flash is a large MoE model; on the RTX 5090 + 128 GB RAM most experts sit in system RAM. Its levels are `none` (thinking off), `low`, `high` (the default) and `max`, sent as a top-level `reasoning_effort`.

## All suites

Mean score per suite, with the number of runs, the mean time and the mean tokens of one run, and the average speed (all tokens ÷ all generation time). Settings are sorted by how many suites they were run on, then by the mean of their suite scores. **Problem tasks** = tasks a setting scored below 90% on in at least half of its runs (and at least twice), in any suite.

| # | Model | Quant | Backend | Effort | Base | Hard | Practical | Tools | Mean of suites | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | DeepSeek-V4.1-Flash | Maya-S | Maya | high | **100.0%** (1×, 75 min, 50k tok, 11 tok/s) | – | – | – | 100.0% (1 of 4) | – |

## Base suite

| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | Maya-S | Maya | high | 1 | **100.0%** | – | 87.5% | 0% | 75.3 | 50.4k | 11.2 | – |

Score @10 min/32k = the score if every task had to finish within 10 minutes and 32,768 tokens. Broken = share of tasks where generation itself failed (out of tokens or time, stopped mid-thought, looped, no final answer). `~` = token count partly estimated. All other suites' tables: RESULTS_TABLE*.md.
