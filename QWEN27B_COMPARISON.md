# Qwen3.8-27B: quant and reasoning-level comparison

All runs: base suite (10 tasks: 6 × TypeScript + Three.js, 4 × Python), temperature 1.0, `--preset qwen-think`, 65,536-token and 60-minute limit per task, one run per setting.

**Two different computers.** PC A = RTX 5090 32 GB (the Q6 runs, 25 Sep). PC B = a second PC (all other runs, 26 Sep; peak VRAM ~14–15.5 GB). Scores are comparable across PCs; speed and time are not.

## Key findings

- **Best overall: UD-Q6_K_M (PC A), 99.3% average of `low` and `medium`.** The highest-precision quant is also the most accurate.
- **Best 3-bit quants (PC B): AP IQ3_XS (97.9% average, steady at both levels) and AP IQ3_S (100% at `medium`, 93.3% at `low`).**
- **Weakest: abliterated GSQ-RCO IQ3_XXS (87.3%).** It is both the smallest quant and a modified (abliterated) model, so the test cannot say which of the two costs the points.
- **EXL3 is good at `low` but clearly worse at `medium`.** EXL3 3.0 bpw `low` scored 96.4% in 6.7 min, the fastest run on PC B. At `medium`, both EXL3 quants dropped to 81–84%, with one task left without an answer. The same pattern on two quants suggests it is not pure chance, but each setting ran only once.
- **`xhigh` does not help on code** (Q6: 92.9% in 37.5 min vs 100% in 4.7 min at `low`).
- **p2_sliding_median decides the ranking.** 10 of the 15 runs lost points there. Most other tasks were solved by almost every quant.
- **Low-bit GGUF quants think longer.** The llama.cpp 3-bit quants used 30–47k tokens per test, compared with 22–29k for Q6. EXL3 at `low` used the fewest (about 25k).
- **Memory:** all 3-bit quants peak at 14–15.5 GB VRAM. EXL3 needs about half the system RAM of llama.cpp (13.5–17 GB vs 24–27 GB).

## Caveats

- One run per setting at temperature 1.0. Differences of a few points can be noise; repeat the top candidates 2–3 times before choosing.
- Speed and time are only comparable within the same PC.
- "AP" and "abliterated GSQ-RCO" are the run labels used; see the model files for the exact source of each quant.

## All runs

| # | Quant | Backend | PC | Effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Avg tok/s (from time) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | UD-Q6_K_M | llama.cpp | A | low | **100.0%** | 100.0 | 100.0 | 4.7 | 28.7k | 21.9k | 108.9 | 29.8 | 39.8 |
| 2 | AP IQ3_S | llama.cpp | B | medium | **100.0%** | 100.0 | 100.0 | 8.8 | 36.9k | 29.3k | 72.6 | 15.2 | 27.0 |
| 3 | UD-Q6_K_M | llama.cpp | A | medium | **98.6%** | 97.2 | 100.0 | 3.9 | 22.2k | 14.1k | 105.3 | 29.8 | 39.7 |
| 4 | AP IQ3_XS | llama.cpp | B | medium | **98.2%** | 96.4 | 100.0 | 8.8 | 37.2k | 29.6k | 73.5 | 14.8 | 26.2 |
| 5 | AP IQ3_XS | llama.cpp | B | low | **97.5%** | 95.0 | 100.0 | 12.3 | 46.8k | 39.4k | 65.3 | 14.8 | 24.0 |
| 6 | EXL3 3.0 bpw | ExLlamaV3 | B | low | **96.4%** | 92.9 | 100.0 | 6.7 | 25.0k | 18.7k | 65.9 | 15.4 | 13.7 |
| 7 | abliterated GSQ-RCO IQ3_S (MTP) | llama.cpp | B | medium | **95.7%** | 92.9 | 98.6 | 7.9 | 29.8k | 21.9k | 66.1 | 15.5 | 27.4 |
| 8 | EXL3 2.2 bpw | ExLlamaV3 | B | low | **93.6%** | 87.2 | 100.0 | 6.1 | 25.6k | 20.4k | 74.7 | 14.1 | 13.5 |
| 9 | AP IQ3_S | llama.cpp | B | low | **93.3%** | 86.5 | 100.0 | 9.7 | 41.0k | 33.5k | 73.0 | 15.2 | 24.2 |
| 10 | abliterated GSQ-RCO IQ3_S (MTP) | llama.cpp | B | low | **92.9%** | 85.7 | 100.0 | 10.5 | 40.2k | 33.2k | 66.0 | 15.5 | 24.6 |
| 11 | UD-Q6_K_M | llama.cpp | A | xhigh (default) | **92.9%** | 85.7 | 100.0 | 37.5 | 194.0k | 184.8k | 87.1 | 30.0 | 39.7 |
| 12 | abliterated GSQ-RCO IQ3_XXS | llama.cpp | B | medium | **88.3%** | 85.7 | 90.9 | 9.2 | 38.3k | 30.4k | 73.9 | 15.1 | 26.9 |
| 13 | abliterated GSQ-RCO IQ3_XXS | llama.cpp | B | low | **86.3%** | 89.3 | 83.3 | 10.6 | 45.0k | 37.4k | 75.3 | 15.1 | 27.0 |
| 14 | EXL3 3.0 bpw | ExLlamaV3 | B | medium | **83.6%** | 72.2 | 95.0 | 13.8 | ~35.4k | ~29.2k | 44.0 | 15.5 | 17.1 |
| 15 | EXL3 2.2 bpw | ExLlamaV3 | B | medium | **81.1%** | 75.8 | 86.4 | 9.6 | 33.1k | 26.8k | 61.2 | 14.1 | 16.3 |

## Average of `low` and `medium` per quant

| Quant | PC | low | medium | Average | Avg time (min) |
|---|---|---|---|---|---|
| UD-Q6_K_M | A | 100.0% | 98.6% | **99.3%** | 4.3 |
| AP IQ3_XS | B | 97.5% | 98.2% | **97.9%** | 10.6 |
| AP IQ3_S | B | 93.3% | 100.0% | **96.6%** | 9.2 |
| abliterated GSQ-RCO IQ3_S (MTP) | B | 92.9% | 95.7% | **94.3%** | 9.2 |
| EXL3 3.0 bpw | B | 96.4% | 83.6% | **90.0%** | 10.2 |
| EXL3 2.2 bpw | B | 93.6% | 81.1% | **87.4%** | 7.8 |
| abliterated GSQ-RCO IQ3_XXS | B | 86.3% | 88.3% | **87.3%** | 9.9 |

## Score per task (%)

| Quant / effort | t1_cube | t2_solar | t3_instanced_wave | t4_shader_water | t5_raycast_click | t6_terrain | p1_parse_duration | p2_sliding_median | p3_topo_order | p4_gather_limited |
|---|---|---|---|---|---|---|---|---|---|---|
| UD-Q6_K_M / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| UD-Q6_K_M / medium | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 100 |
| AP IQ3_XS / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| AP IQ3_XS / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 80 |
| EXL3 3.0 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 71 | 100 | 100 |
| abliterated GSQ-RCO IQ3_S (MTP) / medium | 100 | 100 | 100 | 100 | 100 | 92 | 100 | 71 | 100 | 100 |
| EXL3 2.2 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 60 |
| AP IQ3_S / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 57 | 100 | 100 |
| abliterated GSQ-RCO IQ3_S (MTP) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| UD-Q6_K_M / xhigh (default) | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| abliterated GSQ-RCO IQ3_XXS / medium | 100 | 100 | 45 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| abliterated GSQ-RCO IQ3_XXS / low | 100 | 100 | 100 | 100 | 100 | 0 | 100 | 57 | 100 | 100 |
| EXL3 3.0 bpw / medium | 100 | 100 | 100 | 70 | 100 | 100 | 89 | 0 (none) | 100 | 100 |
| EXL3 2.2 bpw / medium | 100 | 100 | 100 | 60 | 100 | 58 | 89 | 14 | 100 | 100 |

(limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer. `~` = token count partly estimated.
