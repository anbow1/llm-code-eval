# Results table: GLM-5.3-Flash

Every GLM-5.3-Flash variant that has been run, in all four suites. GLM-5.3-Flash is a large MoE model; on the RTX 5090 + 128 GB RAM most experts sit in system RAM, so it runs at 11–24 tok/s. The chat template knows the levels `low`, `high` and `max`; runs started with `medium` actually ran at `high` and are listed as `high`.

## All suites

Mean score per suite, with the number of runs and the mean time of one run. Settings are sorted by how many suites they were run on, then by the mean of their suite scores.

| # | Model | Quant | Backend | Effort | Base | Hard | Practical | Tools | Mean of suites |
|---|---|---|---|---|---|---|---|---|---|
| 1 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | **92.2%** (5×, 17 min) | **90.1%** (5×, 50 min) | **97.6%** (3×, 5 min) | **100.0%** (2×, 3 min) | 95.0% (4 of 4) |
| 2 | GLM-5.3-Flash derisked | Maya-M | Maya | high | **85.1%** (2×, 18 min) | **86.5%** (4×, 41 min) | **98.8%** (4×, 4 min) | **99.6%** (4×, 2 min) | 92.5% (4 of 4) |
| 3 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | high | **100.0%** (1×, 13 min) | **86.0%** (6×, 41 min) | – | – | 93.0% (2 of 4) |
| 4 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | high | **95.5%** (1×, 16 min) | **89.1%** (2×, 59 min) | – | – | 92.3% (2 of 4) |
| 5 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | **99.3%** (2×, 26 min) | **80.0%** (3×, 96 min) | – | – | 89.7% (2 of 4) |
| 6 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | **93.9%** (1×, 19 min) | **82.9%** (2×, 91 min) | – | – | 88.4% (2 of 4) |
| 7 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | low | **86.3%** (2×, 9 min) | **81.1%** (1×, 9 min) | – | – | 83.7% (2 of 4) |
| 8 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | **83.5%** (2×, 12 min) | **77.9%** (2×, 19 min) | – | – | 80.7% (2 of 4) |
| 9 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | high | **90.3%** (2×, 24 min) | – | – | – | 90.3% (1 of 4) |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | **87.5%** (1×, 206 min) | – | – | – | 87.5% (1 of 4) |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | low | **85.6%** (2×, 9 min) | – | – | – | 85.6% (1 of 4) |

## Base suite

| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash | EXL3 3.05 bpw | Maya | high | 1 | **100.0%** | – | 100.0% | 0% | 13.0 | 14.0k | 18.5 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | 2 | **99.3%** | 99–100 | 93.1% | 0% | 25.8 | ~18.8k | 12.3 |
| GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | high | 1 | **95.5%** | – | 95.5% | 0% | 16.3 | 12.9k | 13.5 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | 1 | **93.9%** | – | 93.9% | 0% | 18.8 | 13.5k | 12.4 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | 5 | **92.2%** | 86–99 | 90.5% | 2% | 16.8 | 19.2k | 19.5 |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | high | 2 | **90.3%** | 83–97 | 86.2% | 0% | 23.6 | 18.4k | 13.6 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | 1 | **87.5%** | – | 41.7% | 10% | 205.8 | ~159.1k | 12.9 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | low | 2 | **86.3%** | 86–86 | 86.3% | 0% | 8.9 | 6.6k | 14.1 |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | low | 2 | **85.6%** | 85–86 | 85.6% | 0% | 9.2 | 6.1k | 12.1 |
| GLM-5.3-Flash derisked | Maya-M | Maya | high | 2 | **85.1%** | 82–88 | 78.8% | 0% | 17.6 | 23.0k | 23.5 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | 2 | **83.5%** | 83–84 | 83.5% | 0% | 12.3 | 8.7k | 12.4 |

## Hard suite

| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | 5 | **90.1%** | 83–96 | 73.4% | 7% | 50.5 | ~55.7k | 18.5 |
| GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | high | 2 | **89.1%** | 81–97 | 80.8% | 8% | 58.8 | ~49.9k | 14.2 |
| GLM-5.3-Flash derisked | Maya-M | Maya | high | 4 | **86.5%** | 72–100 | 76.0% | 8% | 41.2 | ~57.5k | 23.4 |
| GLM-5.3-Flash | EXL3 3.05 bpw | Maya | high | 6 | **86.0%** | 69–100 | 77.2% | 3% | 41.1 | ~48.2k | 19.6 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | 2 | **82.9%** | 83–83 | 74.6% | 17% | 91.3 | ~74.5k | 13.6 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | low | 1 | **81.1%** | – | 81.1% | 0% | 8.7 | 7.9k | 15.5 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | 3 | **80.0%** | 76–82 | 68.9% | 17% | 95.7 | ~61.1k | 10.7 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | 2 | **77.9%** | 71–84 | 69.6% | 0% | 19.4 | ~13.2k | 11.6 |

## Practical suite

| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash derisked | Maya-M | Maya | high | 4 | **98.8%** | 98–100 | 98.8% | 0% | 3.5 | 4.1k | 19.2 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | 3 | **97.6%** | 98–98 | 97.6% | 0% | 4.8 | 3.8k | 13.4 |

## Tools suite

| Model | Quant | Backend | Effort | Runs | Mean | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | 2 | **100.0%** | 100–100 | 100.0% | 0% | 3.0 | 1.2k | 6.7 |
| GLM-5.3-Flash derisked | Maya-M | Maya | high | 4 | **99.6%** | 98–100 | 99.6% | 0% | 2.0 | 1.2k | 10.3 |

Score @10 min/32k = the score if every task had to finish within 10 minutes and 32,768 tokens. Broken = share of tasks where generation itself failed (out of tokens or time, stopped mid-thought, looped, no final answer). `~` = token count partly estimated. All other suites' tables: RESULTS_TABLE*.md.
