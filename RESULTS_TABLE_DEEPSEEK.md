# Results table: DeepSeek-V4

Every DeepSeek-V4 / V4.1 variant that has been run, in all four suites (`--preset ds4`). DeepSeek-V4-Flash is a large MoE model; on the RTX 5090 + 128 GB RAM most experts sit in system RAM. Its levels are `none` (thinking off), `low`, `high` (the default) and `max`, sent as a top-level `reasoning_effort`.

## All suites

Mean score per suite, with the number of runs, the mean time and the mean tokens of one run, and the average speed (all tokens ÷ all generation time). Settings are sorted by how many suites they were run on, then by the mean of their suite scores. **Problem tasks** = tasks a setting scored below 90% on in at least half of its runs (and at least twice), in any suite.

| # | Model | Quant | Backend | RAM | Effort | Base | Hard | Practical | Tools | Mean of suites | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | DeepSeek-V4.1-Flash | Maya-S | Maya | 192 GB | high | – | **100.0%** (2×, 83 min, 120k tok, 24 tok/s) | – | **99.6%** (4×, 4 min, 2k tok, 8 tok/s) | 99.8% (2 of 4) | – |
| 2 | DeepSeek-V4.1-Flash | Maya-S | Maya | 128 GB | high | **100.0%** (1×, 75 min, 50k tok, 11 tok/s) | – | – | – | 100.0% (1 of 4) | – |
| 3 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | 192 GB | high | – | **100.0%** (2×, 61 min, 96k tok, 26 tok/s) | – | – | 100.0% (1 of 4) | – |
| 4 | DeepSeek-V4.1-Flash | Maya-S | Maya | 128 GB | low | – | **100.0%** (1×, 123 min, 84k tok, 11 tok/s) | – | – | 100.0% (1 of 4) | – |

## Base suite

| Model | Quant | Backend | RAM | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | Maya-S | Maya | 128 GB | high | 1 | **100.0%** | – | 87.5% | 0% | 75.3 | 50.4k | 11.2 | – |

## Hard suite

| Model | Quant | Backend | RAM | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | 192 GB | high | 2 | **100.0%** | 100–100 | 66.7% | 0% | 61.4 | 96.3k | 26.2 | – |
| DeepSeek-V4.1-Flash | Maya-S | Maya | 192 GB | high | 2 | **100.0%** | 100–100 | 33.3% | 0% | 82.6 | 120.2k | 24.3 | – |
| DeepSeek-V4.1-Flash | Maya-S | Maya | 128 GB | low | 1 | **100.0%** | – | 16.7% | 0% | 123.1 | 84.2k | 11.4 | – |

## Tools suite

| Model | Quant | Backend | RAM | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | Maya-S | Maya | 192 GB | high | 4 | **99.6%** | 98–100 | 99.6% | 0% | 3.6 | 1.8k | 8.5 | – |

Score @10 min/32k = the score if every task had to finish within 10 minutes and 32,768 tokens. Broken = share of tasks where generation itself failed (out of tokens or time, stopped mid-thought, looped, no final answer). `~` = token count partly estimated. All other suites' tables: RESULTS_TABLE*.md.
