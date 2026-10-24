# Results table: base suite

10 tasks (6 × TypeScript + Three.js, 4 × Python). Hard-suite results are in [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **100.0%** | – | 100.0% | 0% | 4.7 | 28.7k | 108.6 | 29.8 |
| 2 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **100.0%** | – | 100.0% | 0% | 5.0 | 30.5k | 108.1 | 26.9 |
| 3 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **100.0%** | – | 100.0% | 0% | 6.5 | ~42.7k | 114.7 | 26.9 |
| 4 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 2 | **100.0%** | 100–100 | 100.0% | 0% | 8.2 | 34.6k | 73.0 | 15.3 |
| 5 | Qwen3.8-27B | GSQ-RCO IQ3_XXS MTP | llama.cpp | RTX 4080 16 GB | medium | 1 | **100.0%** | – | 100.0% | 0% | 8.4 | 34.5k | 71.9 | 15.3 |
| 6 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 1 | **100.0%** | – | 100.0% | 0% | 13.0 | 14.0k | 18.5 | 31.1 |
| 7 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | 1 | **100.0%** | – | 87.5% | 0% | 31.3 | 65.6k | 35.3 | 30.8 |
| 8 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 1 | **100.0%** | – | 87.5% | 0% | 35.3 | 73.3k | 35.0 | 30.8 |
| 9 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **100.0%** | – | 75.0% | 0% | 54.6 | 72.1k | 22.1 | 24.6 |
| 10 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB | high | 1 | **100.0%** | – | 87.5% | 0% | 75.3 | 50.4k | 11.2 | 31.0 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 2 | **99.3%** | 99–100 | 93.1% | 0% | 25.8 | ~18.8k | 12.3 | 30.2 |
| 12 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 1 | **99.2%** | – | 86.7% | 0% | 29.5 | 55.4k | 31.6 | 26.8 |
| 13 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **98.6%** | – | 98.6% | 0% | 3.9 | 22.2k | 105.9 | 29.8 |
| 14 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 3 | **98.5%** | 96–100 | 98.5% | 0% | 7.3 | ~34.7k | 83.8 | 15.6 |
| 15 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.2%** | – | 98.2% | 0% | 8.8 | 37.2k | 73.9 | 14.8 |
| 16 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.2%** | – | 98.2% | 0% | 9.5 | 37.7k | 68.3 | 15.6 |
| 17 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | low | 1 | **97.5%** | – | 97.5% | 0% | 12.3 | 46.8k | 65.1 | 14.8 |
| 18 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 3 | **97.3%** | 94–100 | 97.3% | 0% | 8.2 | 37.6k | 80.8 | 31.3 |
| 19 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | medium | 1 | **95.7%** | – | 95.7% | 0% | 7.9 | 29.8k | 66.2 | 15.5 |
| 20 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | **95.5%** | – | 95.5% | 0% | 16.3 | 12.9k | 13.5 | 30.0 |
| 21 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 2 | **95.5%** | 91–100 | 95.5% | 0% | 5.2 | 36.2k | 124.5 | 30.6 |
| 22 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | low | 1 | **94.6%** | – | 94.6% | 0% | 6.7 | 29.9k | 79.2 | 30.9 |
| 23 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 1 | **93.9%** | – | 93.9% | 0% | 18.8 | 13.5k | 12.4 | 30.8 |
| 24 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 2 | **93.8%** | 88–100 | 93.8% | 5% | 9.4 | 76.2k | 140.4 | 30.6 |
| 25 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | low | 1 | **92.9%** | – | 92.9% | 0% | 10.5 | 40.2k | 65.7 | 15.5 |
| 26 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | default (xhigh) | 1 | **92.9%** | – | 79.2% | 0% | 37.5 | 194.0k | 87.1 | 30.0 |
| 27 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 5 | **92.2%** | 86–99 | 90.5% | 2% | 16.8 | 19.2k | 19.5 | 31.2 |
| 28 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | 2 | **90.9%** | 89–93 | 90.9% | 0% | 8.2 | 34.0k | 71.7 | 15.3 |
| 29 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **90.7%** | 84–100 | 86.6% | 3% | 12.9 | ~57.7k | 76.6 | 15.6 |
| 30 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **90.6%** | – | 90.6% | 0% | 12.8 | 25.0k | 33.7 | 29.3 |
| 31 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | high | 2 | **90.3%** | 83–97 | 86.2% | 0% | 23.6 | 18.4k | 13.6 | 29.0 |
| 32 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | medium | 1 | **88.3%** | – | 88.3% | 0% | 9.2 | 38.3k | 74.3 | 15.1 |
| 33 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 3 | **87.8%** | 78–94 | 87.8% | 0% | 9.6 | ~39.6k | 76.2 | 14.9 |
| 34 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | low | 1 | **87.5%** | – | 87.5% | 10% | 68.2 | 87.6k | 21.5 | 24.6 |
| 35 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | max | 1 | **87.5%** | – | 41.7% | 10% | 205.8 | ~159.1k | 12.9 | 27.0 |
| 36 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 2 | **86.3%** | 86–86 | 86.3% | 0% | 8.9 | 6.6k | 14.1 | 31.0 |
| 37 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | low | 1 | **86.3%** | – | 86.3% | 0% | 10.6 | 45.0k | 75.0 | 15.1 |
| 38 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **86.3%** | 81–93 | 86.3% | 0% | 8.3 | ~37.7k | 80.9 | 15.0 |
| 39 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **85.6%** | 85–86 | 85.6% | 0% | 9.2 | 6.1k | 12.1 | 29.0 |
| 40 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 2 | **85.1%** | 82–88 | 78.8% | 0% | 17.6 | 23.0k | 23.5 | 31.2 |
| 41 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | low | 1 | **83.8%** | – | 83.8% | 0% | 12.1 | 47.2k | 68.4 | 15.6 |
| 42 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **83.5%** | 83–84 | 83.5% | 0% | 12.3 | 8.7k | 12.4 | 30.2 |
| 43 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | default (xhigh) | 1 | **79.2%** | – | 45.8% | 0% | 84.7 | ~176.0k | 34.8 | 29.4 |
| 44 | Qwen3.8-Flash-Next | GSQ-RCO IQ1_M | Strata | RTX 5090 32 GB | medium | 1 | **45.1%** | – | 45.1% | 0% | 4.4 | 29.9k | 151.1 | 30.7 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped mid-thought).

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 1 | 2 | **100.0%** | 0.0 | 100.0% | 10/10 | 0% | 0/10 | – |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 2 | **99.3%** | 0.2 | 99.2% | 8/10 | 0% | 0/10 | – |
| Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 1 | 3 | **98.5%** | 1.9 | 96.4% | 8/10 | 0% | 0/10 | – |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 1 | 3 | **97.3%** | 3.2 | 93.7% | 8/10 | 0% | 0/10 | p2_sliding_median 2/3 (wrong 2) |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 1 | 2 | **95.5%** | 6.4 | 90.9% | 6/10 | 0% | 0/10 | – |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 1 | 2 | **93.8%** | 8.8 | 87.5% | 9/10 | 5% | 0/10 | – |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 1 | 5 | **92.2%** | 5.4 | 86.5% | 5/10 | 2% | 0/10 | t1_cube 3/5 (wrong 3) |
| Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | 1 | 2 | **90.9%** | 3.3 | 88.6% | 7/10 | 0% | 0/10 | p2_sliding_median 2/2 (wrong 2) |
| Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | 3 | **90.7%** | 8.4 | 83.6% | 7/10 | 3% | 0/10 | p2_sliding_median 2/3 (wrong 1, none 1); t4_shader_water 2/3 (wrong 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 2 | **90.3%** | 9.8 | 83.4% | 6/10 | 0% | 0/10 | – |
| Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 1 | 3 | **87.8%** | 8.1 | 78.5% | 5/10 | 0% | 0/10 | p2_sliding_median 2/3 (wrong 2) |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 1 | 2 | **86.3%** | 0.1 | 86.3% | 5/10 | 0% | 0/10 | – |
| Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | 3 | **86.3%** | 5.8 | 81.1% | 5/10 | 0% | 0/10 | p2_sliding_median 2/3 (wrong 2); t6_terrain 2/3 (wrong 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | low | 1 | 2 | **85.6%** | 0.3 | 85.4% | 5/10 | 0% | 0/10 | p4_gather_limited 2/2 (wrong 2); p1_parse_duration 2/2 (wrong 2) |
| GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 1 | 2 | **85.1%** | 4.0 | 82.3% | 6/10 | 0% | 0/10 | – |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | 2 | **83.5%** | 0.8 | 82.9% | 6/10 | 0% | 0/10 | p4_gather_limited 2/2 (wrong 2); p1_parse_duration 2/2 (wrong 2) |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 25.09 16:11 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 4.7 | 28.7k | 21.9k | 6.8k | **108.9** | 121 | 29.8 | 39.8 |
| 2 | 30.09 19:15 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 4.9 | 34.8k | 26.5k | 8.3k | **129.4** | 145 | 30.5 | 68.3 |
| 3 | 29.09 07:07 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 5.0 | 30.5k | 24.2k | 6.3k | **108.6** | 134 | 26.9 | 17.3 |
| 4 | 03.10 10:42 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 5.4 | 37.1k | 30.1k | 7.0k | **124.5** | 144 | 30.6 | 65.6 |
| 5 | 29.09 07:12 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 6.5 | ~42.7k | ~36.0k | ~6.7k | **115.2** | 135 | 26.9 | 19.3 |
| 6 | 27.09 08:41 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 7.7 | 32.3k | 24.8k | 7.5k | **73.6** | 79 | 15.3 | 25.7 |
| 7 | 16.10 22:02 | Qwen3.8-27B | GSQ-RCO IQ3_XXS MTP | llama.cpp | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 8.4 | 34.5k | 27.5k | 7.0k | **71.8** | 79 | 15.3 | 24.1 |
| 8 | 27.09 07:52 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **100.0%** | 100.0 | 100.0 | 8.6 | ~39.9k | ~33.8k | ~6.1k | **80.2** | 95 | 15.5 | 14.7 |
| 9 | 26.09 21:05 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 8.8 | 36.9k | 29.3k | 7.6k | **72.6** | 79 | 15.2 | 27.0 |
| 10 | 07.10 22:15 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 10.3 | 50.7k | 43.1k | 7.6k | **84.6** | 87 | 30.9 | 102.1 |
| 11 | 13.10 18:29 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 13.0 | 14.0k | 6.5k | 7.5k | **18.5** | 19 | 31.1 | 109.4 |
| 12 | 27.09 08:15 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 18.3 | ~81.6k | ~74.0k | ~7.5k | **75.8** | 91 | 15.6 | 15.0 |
| 13 | 29.09 20:15 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 31.3 | 65.6k | 58.8k | 6.8k | **35.3** | 38 | 30.8 | 68.4 |
| 14 | 29.09 20:46 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 35.3 | 73.3k | 65.8k | 7.5k | **35.0** | 38 | 30.8 | 72.7 |
| 15 | 25.09 17:37 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 54.6 | 72.1k | 64.4k | 7.8k | **22.2** | 23 | 24.6 | 67.3 |
| 16 | 20.10 23:16 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 75.3 | 50.4k | 41.0k | 9.4k | **11.2** | 11 | 31.0 | 127.2 |
| 17 | 25.09 09:26 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **99.5%** | 99.1 | 100.0 | 20.5 | 15.0k | 7.8k | 7.2k | **12.4** | 14 | 27.0 | 117.7 |
| 18 | 09.10 12:56 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **99.2%** | 100.0 | 98.5 | 15.0 | 13.8k | 6.7k | 7.1k | **15.7** | 17 | 30.9 | 118.4 |
| 19 | 25.09 23:45 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **99.2%** | 100.0 | 98.5 | 29.5 | 55.4k | 47.7k | 7.8k | **31.7** | 39 | 26.8 | 101.3 |
| 20 | 02.10 21:09 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **99.2%** | 100.0 | 98.5 | 31.0 | ~22.6k | ~15.6k | ~7.0k | **12.3** | 13 | 30.2 | 115.2 |
| 21 | 27.09 08:08 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **99.1%** | 98.1 | 100.0 | 6.5 | ~31.9k | ~26.1k | ~5.7k | **86.8** | 96 | 15.6 | 14.8 |
| 22 | 25.09 16:15 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | **98.6%** | 97.2 | 100.0 | 3.9 | 22.2k | 14.1k | 8.1k | **105.3** | 120 | 29.8 | 39.7 |
| 23 | 06.10 19:48 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **98.2%** | 96.4 | 100.0 | 6.6 | 30.1k | 22.8k | 7.3k | **80.8** | 88 | 31.2 | 79.1 |
| 24 | 26.09 20:45 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | medium | **98.2%** | 96.4 | 100.0 | 8.8 | 37.2k | 29.6k | 7.6k | **73.5** | 80 | 14.8 | 26.2 |
| 25 | 27.09 09:03 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **98.2%** | 96.4 | 100.0 | 9.5 | 37.7k | 29.2k | 8.5k | **68.6** | 77 | 15.6 | 26.3 |
| 26 | 26.09 20:33 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | low | **97.5%** | 95.0 | 100.0 | 12.3 | 46.8k | 39.4k | 7.5k | **65.3** | 79 | 14.8 | 24.0 |
| 27 | 05.10 18:54 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | high | **97.2%** | 100.0 | 94.4 | 21.3 | 17.1k | 9.5k | 7.6k | **13.8** | 14 | 29.0 | 106.8 |
| 28 | 26.09 23:20 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **96.4%** | 92.9 | 100.0 | 6.7 | ~32.4k | ~25.4k | ~6.9k | **85.4** | 97 | 15.4 | 13.7 |
| 29 | 26.09 20:22 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | medium | **95.7%** | 92.9 | 98.6 | 7.9 | 29.8k | 21.9k | 7.9k | **66.1** | 73 | 15.5 | 27.4 |
| 30 | 14.10 20:08 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **95.5%** | 92.6 | 98.3 | 16.3 | 12.9k | 6.2k | 6.7k | **13.5** | 15 | 30.0 | 109.4 |
| 31 | 13.10 18:45 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **95.5%** | 100.0 | 90.9 | 19.9 | 24.6k | 16.8k | 7.8k | **21.2** | 22 | 31.2 | 114.6 |
| 32 | 07.10 22:08 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | low | **94.6%** | 89.3 | 100.0 | 6.7 | 29.9k | 22.5k | 7.5k | **78.7** | 87 | 30.9 | 99.8 |
| 33 | 25.09 22:47 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **93.9%** | 100.0 | 87.9 | 18.8 | 13.5k | 6.4k | 7.2k | **12.4** | 14 | 30.8 | 127.1 |
| 34 | 06.10 19:55 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **93.7%** | 92.9 | 94.4 | 7.7 | 32.2k | 24.2k | 8.0k | **75.8** | 84 | 31.3 | 81.9 |
| 35 | 26.09 23:01 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **93.6%** | 87.2 | 100.0 | 6.1 | 25.6k | 20.4k | 5.3k | **74.7** | 87 | 14.1 | 13.5 |
| 36 | 26.09 20:55 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | **93.3%** | 86.5 | 100.0 | 9.7 | 41.0k | 33.5k | 7.5k | **73.0** | 78 | 15.2 | 24.2 |
| 37 | 26.09 20:12 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | low | **92.9%** | 85.7 | 100.0 | 10.5 | 40.2k | 33.2k | 7.1k | **66.0** | 74 | 15.5 | 24.6 |
| 38 | 25.09 15:26 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | default (xhigh) | **92.9%** | 85.7 | 100.0 | 37.5 | 194.0k | 184.8k | 9.2k | **87.1** | 94 | 30.0 | 39.7 |
| 39 | 27.09 07:19 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.6%** | 97.2 | 88.1 | 6.4 | ~27.8k | ~21.6k | ~6.2k | **79.4** | 87 | 14.2 | 15.5 |
| 40 | 11.10 11:59 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **92.6%** | 100.0 | 85.2 | 11.4 | 12.9k | 5.2k | 7.6k | **19.2** | 20 | 31.1 | 114.9 |
| 41 | 27.09 07:27 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **91.2%** | 89.3 | 93.1 | 12.4 | ~54.4k | ~48.2k | ~6.2k | **76.5** | 88 | 14.9 | 15.4 |
| 42 | 30.09 19:10 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | **90.9%** | 84.8 | 97.1 | 5.1 | 35.4k | 28.4k | 7.0k | **125.4** | 140 | 30.5 | 70.1 |
| 43 | 25.09 20:59 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **90.6%** | 81.2 | 100.0 | 12.8 | 25.0k | 18.0k | 7.1k | **33.6** | 36 | 29.3 | 86.1 |
| 44 | 27.09 08:01 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **88.6%** | 82.1 | 95.0 | 6.7 | ~30.9k | ~24.7k | ~6.2k | **80.6** | 92 | 15.5 | 14.9 |
| 45 | 27.09 08:34 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | **88.6%** | 82.1 | 95.0 | 6.8 | 27.0k | 19.7k | 7.4k | **70.3** | 75 | 15.3 | 22.6 |
| 46 | 26.09 19:52 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | medium | **88.3%** | 85.7 | 90.9 | 9.2 | 38.3k | 30.4k | 7.9k | **73.9** | 79 | 15.1 | 26.9 |
| 47 | 12.10 23:29 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **87.9%** | 80.0 | 95.7 | 9.1 | 11.9k | 4.8k | 7.0k | **22.7** | 24 | 31.2 | 95.5 |
| 48 | 03.10 10:47 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **87.5%** | 75.0 | 100.0 | 13.9 | 117.6k | 110.4k | 7.2k | **144.1** | 151 | 30.6 | 65.0 |
| 49 | 25.09 16:29 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | low | **87.5%** | 75.0 | 100.0 | 68.2 | 87.6k | 80.3k | 7.3k | **21.5** | 23 | 24.6 | 63.6 |
| 50 | 25.09 09:47 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | max | **87.5%** | 75.0 | 100.0 | 205.8 | ~159.1k | ~149.5k | ~9.7k | **12.9** | 14 | 27.0 | 120.5 |
| 51 | 13.10 19:07 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **87.1%** | 100.0 | 74.2 | 15.1 | 18.3k | 12.1k | 6.2k | **21.0** | 22 | 31.1 | 113.8 |
| 52 | 11.10 11:36 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **86.5%** | 82.1 | 90.9 | 22.8 | 26.3k | 18.9k | 7.4k | **19.8** | 20 | 31.1 | 116.0 |
| 53 | 09.10 12:48 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | **86.4%** | 75.8 | 97.0 | 8.4 | 7.0k | 0.8k | 6.2k | **14.6** | 16 | 30.9 | 118.8 |
| 54 | 09.10 16:26 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | **86.3%** | 74.1 | 98.6 | 9.5 | 6.2k | 0.4k | 5.8k | **13.5** | 16 | 31.0 | 120.9 |
| 55 | 26.09 19:42 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | low | **86.3%** | 89.3 | 83.3 | 10.6 | 45.0k | 37.4k | 7.6k | **75.3** | 81 | 15.1 | 27.0 |
| 56 | 05.10 18:46 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | low | **85.8%** | 82.2 | 89.4 | 8.5 | 6.0k | 0.2k | 5.9k | **12.7** | 14 | 29.0 | 106.0 |
| 57 | 05.10 18:09 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | low | **85.4%** | 72.2 | 98.6 | 9.8 | 6.1k | 0.5k | 5.6k | **11.5** | 14 | 28.9 | 108.3 |
| 58 | 27.09 07:40 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **85.1%** | 77.6 | 92.6 | 8.9 | ~41.4k | ~34.6k | ~6.9k | **81.1** | 89 | 15.0 | 14.9 |
| 59 | 02.10 20:58 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **84.0%** | 75.4 | 92.6 | 11.0 | 7.8k | 1.0k | 6.7k | **13.0** | 15 | 30.2 | 114.8 |
| 60 | 27.09 08:50 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | low | **83.8%** | 84.3 | 83.3 | 12.1 | 47.2k | 39.9k | 7.3k | **68.3** | 77 | 15.6 | 23.4 |
| 61 | 26.09 23:27 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **83.6%** | 72.2 | 95.0 | 13.8 | ~60.8k | ~54.4k | ~6.4k | **75.4** | 96 | 15.5 | 17.1 |
| 62 | 05.10 18:18 | GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | RTX 5090 32 GB | high | **83.4%** | 85.0 | 81.8 | 25.8 | 19.7k | 11.7k | 8.0k | **13.4** | 14 | 29.0 | 106.2 |
| 63 | 25.09 09:12 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **82.9%** | 65.7 | 100.0 | 13.7 | 9.6k | 1.0k | 8.6k | **11.9** | 14 | 27.0 | 119.7 |
| 64 | 12.10 23:03 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **82.3%** | 75.0 | 89.5 | 26.1 | 34.2k | 27.1k | 7.1k | **23.7** | 24 | 31.2 | 127.4 |
| 65 | 26.09 23:07 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **81.1%** | 75.8 | 86.4 | 9.6 | ~43.8k | ~36.8k | ~7.1k | **81.0** | 88 | 14.1 | 16.3 |
| 66 | 25.09 13:50 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | default (xhigh) | **79.2%** | 75.0 | 83.3 | 84.7 | ~176.0k | ~170.8k | ~5.2k | **34.8** | 34 | 29.4 | 83.3 |
| 67 | 27.09 07:09 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **78.5%** | 75.0 | 81.9 | 10.3 | ~38.9k | ~33.1k | ~5.8k | **76.9** | 85 | 14.1 | 14.3 |
| 68 | 14.10 07:28 | Qwen3.8-Flash-Next | GSQ-RCO IQ1_M | Strata | RTX 5090 32 GB | medium | **45.1%** | 75.0 | 15.2 | 4.4 | 29.9k | 22.7k | 7.2k | **149.6** | 174 | 30.7 | 42.1 |

## Score per task (%)

| Run | Model / effort | t1_cube | t2_solar | t3_instanced_wave | t4_shader_water | t5_raycast_click | t6_terrain | p1_parse_duration | p2_sliding_median | p3_topo_order | p4_gather_limited |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25.09 16:11 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 30.09 19:15 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 29.09 07:07 | Qwen3.8-27B EXL3 6.0 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 03.10 10:42 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 29.09 07:12 | Qwen3.8-27B EXL3 6.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:41 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 16.10 22:02 | Qwen3.8-27B GSQ-RCO IQ3_XXS MTP (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 07:52 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 26.09 21:05 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 07.10 22:15 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 13.10 18:29 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:15 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 29.09 20:15 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 29.09 20:46 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 25.09 17:37 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 20.10 23:16 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 25.09 09:26 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 100 | 100 | 100 |
| 09.10 12:56 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 25.09 23:45 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 02.10 21:09 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / high | 100 | 100 | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:08 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 93 | 100 | 100 | 100 |
| 25.09 16:15 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 100 |
| 06.10 19:48 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| 26.09 20:45 | Qwen3.8-27B AP IQ3_XS (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| 27.09 09:03 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| 26.09 20:33 | Qwen3.8-27B AP IQ3_XS (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 80 |
| 05.10 18:54 | GLM-5.3-Flash EXL3 3.05 bpw no MTP (ExLlamaV3) / high | 100 | 100 | 100 | 100 | 100 | 67 | 100 | 100 | 100 | 100 |
| 26.09 23:20 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 71 | 100 | 100 |
| 26.09 20:22 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S MTP (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 92 | 100 | 71 | 100 | 100 |
| 14.10 20:08 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 90 | 100 | 100 | 70 | 100 | 100 | 100 |
| 13.10 18:45 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 45 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 07.10 22:08 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 57 | 100 | 100 |
| 25.09 22:47 | GLM-5.3-Flash GSQ-RCO 3.5-bit (llama.cpp) / high | 45 | 82 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 06.10 19:55 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 67 | 100 | 71 | 100 | 100 |
| 26.09 23:01 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 60 |
| 26.09 20:55 | Qwen3.8-27B AP IQ3_S (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 57 | 100 | 100 |
| 26.09 20:12 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S MTP (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 25.09 15:26 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 27.09 07:19 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 70 | 100 | 58 | 89 | 100 | 100 | 100 |
| 11.10 11:59 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 91 | 20 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 07:27 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 58 | 100 | 57 | 100 | 100 |
| 30.09 19:10 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / low | 100 | 100 | 91 | 100 | 100 | 92 | 96 | 43 | 100 | 100 |
| 25.09 20:59 | Qwen3.8-Flash-Next EXL3 5.05 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 29 | 100 | 100 |
| 27.09 08:01 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 70 | 100 | 100 | 100 | 29 | 100 | 100 |
| 27.09 08:34 | Qwen3.8-27B AP IQ3_S (llama.cpp) / low | 100 | 100 | 100 | 70 | 100 | 100 | 100 | 29 | 100 | 100 |
| 26.09 19:52 | Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS (llama.cpp) / medium | 100 | 100 | 45 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 12.10 23:29 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 91 | 100 | 100 | 100 | 100 | 83 | 100 | 100 | 100 | 20 |
| 03.10 10:47 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 |
| 25.09 16:29 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 |
| 25.09 09:47 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / max | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (time) |
| 13.10 19:07 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 45 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 | 100 | 100 |
| 11.10 11:36 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 45 | 100 | 100 | 100 | 100 | 100 | 100 | 29 | 100 | 100 |
| 09.10 12:48 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / low | 100 | 82 | 100 | 100 | 100 | 100 | 89 | 14 | 100 | 100 |
| 09.10 16:26 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / low | 100 | 100 | 100 | 100 | 100 | 92 | 96 | 100 | 100 | 0 |
| 26.09 19:42 | Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS (llama.cpp) / low | 100 | 100 | 100 | 100 | 100 | 0 | 100 | 57 | 100 | 100 |
| 05.10 18:46 | GLM-5.3-Flash EXL3 3.05 bpw no MTP (ExLlamaV3) / low | 45 | 100 | 100 | 100 | 91 | 100 | 89 | 100 | 100 | 40 |
| 05.10 18:09 | GLM-5.3-Flash EXL3 3.05 bpw no MTP (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 92 | 89 | 100 | 100 | 0 |
| 27.09 07:40 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / medium | 64 | 100 | 100 | 100 | 100 | 92 | 96 | 14 | 100 | 100 |
| 02.10 20:58 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / low | 64 | 100 | 100 | 100 | 100 | 92 | 81 | 100 | 100 | 20 |
| 27.09 08:50 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S (llama.cpp) / low | 100 | 100 | 100 | 0 | 100 | 100 | 100 | 57 | 100 | 80 |
| 26.09 23:27 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 70 | 100 | 100 | 89 | 0 (none) | 100 | 100 |
| 05.10 18:18 | GLM-5.3-Flash EXL3 3.05 bpw no MTP (ExLlamaV3) / high | 45 | 45 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 40 |
| 25.09 09:12 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / low | 100 | 100 | 100 | 100 | 100 | 100 | 63 | 100 | 100 | 0 |
| 12.10 23:03 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 45 | 100 | 100 | 100 | 100 | 92 | 100 | 100 | 0 | 100 |
| 26.09 23:07 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 60 | 100 | 58 | 89 | 14 | 100 | 100 |
| 25.09 13:50 | Qwen3.8-Flash-Next EXL3 5.05 bpw (ExLlamaV3) / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 0 | 0 | 100 | 100 | 100 |
| 27.09 07:09 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / low | 100 | 0 | 100 | 100 | 100 | 92 | 100 | 0 | 100 | 100 |
| 14.10 07:28 | Qwen3.8-Flash-Next GSQ-RCO IQ1_M (Strata) / medium | 0 | 0 | 91 | 0 | 0 | 0 | 100 | 0 | 100 | 100 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
