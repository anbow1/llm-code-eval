# Results table: hard suite (--suite hard)

6 tasks (3 × TypeScript + Three.js, 3 × Python). Base-suite results are in [RESULTS_TABLE.md](RESULTS_TABLE.md).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting", and ranked by their best run under "Best run per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 2 | **100.0%** | 100–100 | 66.7% | 0% | 19.6 | 159.7k | 136.5 | 30.5 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 1 | **97.8%** | – | 97.8% | 0% | 8.4 | 70.4k | 141.3 | 30.5 |
| 3 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **97.6%** | – | 97.6% | 0% | 9.0 | 50.7k | 96.1 | 30.8 |
| 4 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **94.4%** | – | 94.4% | 0% | 6.5 | ~46.1k | 121.9 | 26.9 |
| 5 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 2 | **93.1%** | 92–94 | 93.1% | 0% | 11.0 | ~54.0k | 82.9 | 15.6 |
| 6 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 2 | **93.0%** | 86–100 | 84.8% | 0% | 15.7 | 75.4k | 81.1 | 31.3 |
| 7 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 3 | **90.3%** | 79–98 | 90.3% | 0% | 18.7 | 41.1k | 37.0 | 30.4 |
| 8 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 5 | **90.1%** | 83–96 | 73.4% | 7% | 50.5 | ~55.7k | 18.5 | 31.2 |
| 9 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 2 | **89.1%** | 81–97 | 80.8% | 8% | 58.8 | ~49.9k | 14.2 | 30.0 |
| 10 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **88.5%** | – | 88.5% | 0% | 8.1 | 47.1k | 99.3 | 30.8 |
| 11 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **87.8%** | 83–94 | 87.8% | 6% | 17.8 | 67.4k | 63.9 | 15.4 |
| 12 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 4 | **86.5%** | 72–100 | 76.0% | 8% | 41.2 | ~57.5k | 23.4 | 31.2 |
| 13 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 6 | **86.0%** | 69–100 | 77.2% | 3% | 41.1 | ~48.2k | 19.6 | 31.2 |
| 14 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **84.9%** | – | 69.0% | 0% | 29.2 | 54.0k | 31.0 | 24.5 |
| 15 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | 1 | **82.9%** | – | 66.3% | 17% | 57.3 | 120.1k | 35.1 | 30.8 |
| 16 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 2 | **82.9%** | 83–83 | 74.6% | 17% | 91.3 | ~74.5k | 13.6 | 31.0 |
| 17 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 1 | **81.1%** | – | 81.1% | 0% | 8.7 | 7.9k | 15.5 | 30.9 |
| 18 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 3 | **80.0%** | 76–82 | 68.9% | 17% | 95.7 | ~61.1k | 10.7 | 30.2 |
| 19 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 2 | **79.8%** | 77–83 | 54.8% | 17% | 90.0 | 184.8k | 34.3 | 31.0 |
| 20 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **77.9%** | 71–84 | 69.6% | 0% | 19.4 | ~13.2k | 11.6 | 30.2 |
| 21 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **77.8%** | – | 77.8% | 17% | 10.4 | ~67.6k | 110.4 | 26.9 |
| 22 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | 1 | **72.2%** | – | 16.7% | 17% | 25.3 | 233.2k | 154.8 | 30.0 |
| 23 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | – | 66.7% | 33% | 10.9 | ~53.9k | 83.2 | 15.5 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped mid-thought).

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 1 | 2 | **100.0%** | 0.0 | 100.0% | 6/6 | 0% | 0/6 | – |
| Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | 2 | **93.1%** | 1.4 | 92.1% | 3/6 | 0% | 0/6 | – |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 1 | 2 | **93.0%** | 9.3 | 86.5% | 3/6 | 0% | 0/6 | – |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 1 | 3 | **90.3%** | 9.8 | 79.3% | 1/6 | 0% | 0/6 | h_t3_postfx_invert 2/3 (wrong 2) |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 1 | 5 | **90.1%** | 4.5 | 83.3% | 1/6 | 7% | 0/6 | – |
| GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 2 | **89.1%** | 11.5 | 81.0% | 3/6 | 8% | 0/6 | – |
| Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 1 | 3 | **87.8%** | 5.6 | 83.3% | 4/6 | 6% | 0/6 | h_p3_line_diff 3/3 (wrong 2, limit 1) |
| GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 1 | 4 | **86.5%** | 13.7 | 72.3% | 2/6 | 8% | 0/6 | h_p3_line_diff 2/4 (time 1, none 1); h_t2_instanced_pick 2/4 (wrong 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 1 | 6 | **86.0%** | 10.7 | 69.4% | 1/6 | 3% | 0/6 | h_p3_line_diff 4/6 (wrong 4) |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 1 | 2 | **82.9%** | 0.0 | 82.9% | 4/6 | 17% | 0/6 | h_p3_line_diff 2/2 (time 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 3 | **80.0%** | 3.3 | 76.2% | 1/6 | 17% | 0/6 | h_p3_line_diff 3/3 (time 3) |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 1 | 2 | **79.8%** | 4.4 | 76.7% | 3/6 | 17% | 0/6 | h_p3_line_diff 2/2 (limit 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | 2 | **77.9%** | 9.2 | 71.4% | 0/6 | 0% | 0/6 | – |

## Best run per setting

Ranked by each setting's single best run (on a tie, the faster one). Compare with the mean above: a setting that is high here but lower there is good on a lucky run, not every run.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Best score | Best run | Time (min) | Tokens | Avg tok/s (from time) | Mean of all runs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 2 | **100.0%** | 13.10 23:24 | 19.3 | 181.2k | 157.6 | 100.0% |
| 2 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 6 | **100.0%** | 14.10 20:54 | 35.3 | 46.1k | 21.9 | 86.0% |
| 3 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 4 | **100.0%** | 12.10 19:23 | 38.8 | 53.7k | 23.1 | 86.5% |
| 4 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 2 | **99.6%** | 06.10 19:39 | 7.7 | 40.3k | 89.5 | 93.0% |
| 5 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 3 | **98.1%** | 29.09 01:32 | 17.6 | 39.3k | 37.7 | 90.3% |
| 6 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 1 | **97.8%** | 30.09 19:20 | 8.4 | 70.4k | 142.1 | 97.8% |
| 7 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **97.6%** | 02.10 20:00 | 9.0 | 50.7k | 96.1 | 97.6% |
| 8 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 2 | **97.2%** | 14.10 19:28 | 39.2 | 33.8k | 14.5 | 89.1% |
| 9 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 5 | **95.8%** | 11.10 17:55 | 71.0 | 67.6k | 15.9 | 90.1% |
| 10 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **94.4%** | 29.09 07:19 | 6.5 | ~46.1k | 122.3 | 94.4% |
| 11 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 2 | **94.1%** | 27.09 10:05 | 11.4 | ~52.4k | 77.9 | 93.1% |
| 12 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **94.1%** | 27.09 10:54 | 13.7 | 59.5k | 73.1 | 87.8% |
| 13 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **88.5%** | 02.10 19:42 | 8.1 | 47.1k | 99.7 | 88.5% |
| 14 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **84.9%** | 28.09 22:36 | 29.2 | 54.0k | 31.0 | 84.9% |
| 15 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **84.4%** | 28.09 22:04 | 26.5 | ~17.3k | 11.1 | 77.9% |
| 16 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | 1 | **82.9%** | 29.09 21:25 | 57.3 | 120.1k | 35.0 | 82.9% |
| 17 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 2 | **82.9%** | 29.09 22:23 | 62.6 | 132.1k | 35.3 | 79.8% |
| 18 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 2 | **82.9%** | 02.10 23:08 | 84.4 | ~68.9k | 13.6 | 82.9% |
| 19 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 3 | **82.1%** | 28.09 18:25 | 115.5 | ~73.6k | 10.6 | 80.0% |
| 20 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 1 | **81.1%** | 09.10 13:41 | 8.7 | 7.9k | 15.4 | 81.1% |
| 21 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **77.8%** | 29.09 07:25 | 10.4 | ~67.6k | 110.5 | 77.8% |
| 22 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | 1 | **72.2%** | 13.10 23:43 | 25.3 | 233.2k | 154.7 | 72.2% |
| 23 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | 27.09 10:18 | 10.9 | ~53.9k | 83.4 | 66.7% |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13.10 23:24 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 19.3 | 181.2k | 173.0k | 8.2k | **157.6** | 184 | 30.0 | 67.7 |
| 2 | 30.09 19:29 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 20.0 | 138.2k | 131.7k | 6.5k | **116.4** | 137 | 30.5 | 68.5 |
| 3 | 14.10 20:54 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 35.3 | 46.1k | 38.1k | 8.0k | **21.9** | 22 | 31.1 | 109.9 |
| 4 | 12.10 19:23 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 38.8 | 53.7k | 47.1k | 6.6k | **23.1** | 23 | 31.2 | 101.1 |
| 5 | 06.10 19:39 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **99.6%** | 99.2 | 100.0 | 7.7 | 40.3k | 33.7k | 6.6k | **89.5** | 93 | 31.2 | 75.6 |
| 6 | 29.09 01:32 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **98.1%** | 100.0 | 96.3 | 17.6 | 39.3k | 32.2k | 7.0k | **37.7** | 40 | 26.5 | 96.7 |
| 7 | 30.09 19:20 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | **97.8%** | 99.2 | 96.3 | 8.4 | 70.4k | 64.4k | 5.9k | **142.1** | 147 | 30.5 | 67.9 |
| 8 | 02.10 20:00 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 95.2 | 100.0 | 9.0 | 50.7k | 43.3k | 7.5k | **96.1** | 102 | 30.8 | 42.5 |
| 9 | 14.10 19:28 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **97.2%** | 94.5 | 100.0 | 39.2 | 33.8k | 26.5k | 7.4k | **14.5** | 14 | 30.0 | 109.7 |
| 10 | 11.10 13:24 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **96.3%** | 99.2 | 93.3 | 36.0 | 50.1k | 43.4k | 6.7k | **23.3** | 23 | 31.1 | 100.2 |
| 11 | 11.10 17:55 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **95.8%** | 95.2 | 96.3 | 71.0 | 67.6k | 60.5k | 7.0k | **15.9** | 15 | 31.2 | 115.1 |
| 12 | 29.09 07:19 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **94.4%** | 100.0 | 88.9 | 6.5 | ~46.1k | ~39.0k | ~7.0k | **122.3** | 132 | 26.9 | 19.8 |
| 13 | 27.09 10:05 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 11.4 | ~52.4k | ~45.4k | ~7.0k | **77.9** | 81 | 15.6 | 14.2 |
| 14 | 27.09 10:54 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 13.7 | 59.5k | 52.2k | 7.3k | **73.1** | 78 | 15.3 | 26.3 |
| 15 | 28.09 23:08 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **93.4%** | 90.5 | 96.3 | 22.2 | 48.9k | 41.2k | 7.7k | **37.1** | 40 | 26.4 | 92.7 |
| 16 | 27.09 10:30 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.1%** | 84.2 | 100.0 | 10.6 | ~55.5k | ~47.0k | ~8.5k | **88.5** | 91 | 15.6 | 15.4 |
| 17 | 13.10 21:13 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **91.0%** | 85.7 | 96.3 | 41.5 | 47.0k | 40.0k | 7.0k | **18.9** | 19 | 31.1 | 111.4 |
| 18 | 14.10 23:25 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.9%** | 81.8 | 100.0 | 40.6 | 55.2k | 48.3k | 6.9k | **22.7** | 23 | 31.0 | 113.8 |
| 19 | 11.10 20:54 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.6%** | 99.2 | 82.1 | 67.7 | 59.1k | 52.0k | 7.1k | **14.6** | 14 | 31.1 | 114.7 |
| 20 | 11.10 22:53 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.0%** | 100.0 | 80.0 | 53.5 | 74.0k | 48.6k | 25.4k | **23.2** | 23 | 31.1 | 100.1 |
| 21 | 14.10 22:47 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **88.9%** | 77.8 | 100.0 | 35.0 | 46.0k | 38.1k | 7.9k | **22.0** | 22 | 31.1 | 109.8 |
| 22 | 02.10 19:42 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | **88.5%** | 77.0 | 100.0 | 8.1 | 47.1k | 40.2k | 6.9k | **99.7** | 106 | 30.8 | 38.9 |
| 23 | 12.10 18:37 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **88.5%** | 77.0 | 100.0 | 41.4 | 47.9k | 40.3k | 7.5k | **19.4** | 20 | 31.2 | 109.4 |
| 24 | 06.10 19:15 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **86.5%** | 99.2 | 73.8 | 23.7 | 110.6k | 103.2k | 7.3k | **78.5** | 92 | 31.3 | 73.0 |
| 25 | 27.09 10:42 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **86.1%** | 72.2 | 100.0 | 10.2 | 44.9k | 38.0k | 6.8k | **74.7** | 78 | 15.2 | 22.2 |
| 26 | 28.09 22:36 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **84.9%** | 69.9 | 100.0 | 29.2 | 54.0k | 46.9k | 7.1k | **31.0** | 32 | 24.5 | 58.8 |
| 27 | 28.09 22:04 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **84.4%** | 99.2 | 69.6 | 26.5 | ~17.3k | ~11.8k | ~5.5k | **11.1** | 14 | 30.2 | 115.6 |
| 28 | 11.10 12:16 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **83.3%** | 66.7 | 100.0 | 19.6 | ~22.7k | ~16.2k | ~6.5k | **19.4** | 20 | 31.1 | 114.4 |
| 29 | 27.09 09:14 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **83.3%** | 66.7 | 100.0 | 29.4 | 97.9k | 91.1k | 6.9k | **55.8** | 73 | 15.4 | 21.2 |
| 30 | 29.09 21:25 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | **82.9%** | 65.9 | 100.0 | 57.3 | 120.1k | 113.3k | 6.9k | **35.0** | 37 | 30.8 | 74.5 |
| 31 | 29.09 22:23 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | **82.9%** | 65.9 | 100.0 | 62.6 | 132.1k | 125.6k | 6.5k | **35.3** | 37 | 30.8 | 77.3 |
| 32 | 02.10 23:08 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **82.9%** | 65.9 | 100.0 | 84.4 | ~68.9k | ~62.5k | ~6.4k | **13.6** | 14 | 29.8 | 127.0 |
| 33 | 30.09 06:40 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **82.9%** | 65.9 | 100.0 | 98.3 | ~80.2k | ~74.0k | ~6.1k | **13.6** | 14 | 31.0 | 127.0 |
| 34 | 28.09 18:25 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **82.1%** | 66.7 | 97.4 | 115.5 | ~73.6k | ~66.1k | ~7.5k | **10.6** | 12 | 26.9 | 122.0 |
| 35 | 28.09 20:34 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **81.7%** | 65.9 | 97.4 | 89.7 | ~58.1k | ~52.2k | ~5.9k | **10.8** | 12 | 30.2 | 115.0 |
| 36 | 09.10 13:41 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | **81.1%** | 69.9 | 92.3 | 8.7 | 7.9k | 2.4k | 5.5k | **15.4** | 17 | 30.9 | 118.2 |
| 37 | 14.10 18:10 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **81.0%** | 62.0 | 100.0 | 78.4 | ~65.9k | ~59.9k | ~6.0k | **14.0** | 14 | 30.0 | 108.6 |
| 38 | 05.10 23:18 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **79.3%** | 71.4 | 87.2 | 16.4 | 35.1k | 28.0k | 7.1k | **36.1** | 39 | 30.4 | 95.0 |
| 39 | 13.10 19:24 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **78.4%** | 74.7 | 82.1 | 45.1 | 52.0k | 45.2k | 6.8k | **19.3** | 19 | 31.1 | 112.6 |
| 40 | 29.09 07:25 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **77.8%** | 66.7 | 88.9 | 10.4 | ~67.6k | ~61.1k | ~6.5k | **110.5** | 128 | 26.9 | 19.1 |
| 41 | 14.10 21:34 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **77.4%** | 54.8 | 100.0 | 69.1 | ~99.8k | ~42.6k | ~57.3k | **24.1** | 25 | 31.1 | 100.0 |
| 42 | 30.09 00:28 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | **76.7%** | 66.7 | 86.7 | 117.3 | 237.4k | 229.8k | 7.6k | **33.8** | 36 | 31.0 | 79.6 |
| 43 | 02.10 21:41 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **76.2%** | 52.4 | 100.0 | 81.8 | ~51.7k | ~46.4k | ~5.3k | **10.6** | 13 | 30.2 | 116.4 |
| 44 | 11.10 17:26 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **72.3%** | 57.4 | 87.2 | 20.8 | ~26.6k | ~18.8k | ~7.8k | **21.5** | 22 | 31.2 | 102.0 |
| 45 | 13.10 23:43 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | **72.2%** | 44.4 | 100.0 | 25.3 | 233.2k | 225.5k | 7.6k | **154.7** | 157 | 30.0 | 67.5 |
| 46 | 29.09 18:22 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **71.4%** | 55.6 | 87.2 | 12.4 | 9.0k | 2.9k | 6.1k | **12.6** | 14 | 30.2 | 114.0 |
| 47 | 13.10 20:09 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **69.4%** | 38.9 | 100.0 | 48.4 | ~50.3k | ~43.1k | ~7.2k | **17.4** | 17 | 31.1 | 111.7 |
| 48 | 27.09 10:18 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | **66.7%** | 33.3 | 100.0 | 10.9 | ~53.9k | ~49.6k | ~4.3k | **83.4** | 88 | 15.5 | 14.7 |

## Score per task (%)

| Run | Model / effort | h_t1_physics | h_t2_instanced_pick | h_t3_postfx_invert | h_p1_interval_set | h_p2_expr_eval | h_p3_line_diff |
|---|---|---|---|---|---|---|---|
| 13.10 23:24 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 30.09 19:29 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 14.10 20:54 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 12.10 19:23 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 06.10 19:39 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 98 | 100 |
| 29.09 01:32 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 100 | 89 | 100 | 100 | 100 |
| 30.09 19:20 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / low | 100 | 100 | 89 | 100 | 98 | 100 |
| 02.10 20:00 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / medium | 100 | 100 | 100 | 86 | 100 | 100 |
| 14.10 19:28 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 86 | 98 | 100 |
| 11.10 13:24 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 80 | 100 | 100 | 98 | 100 |
| 11.10 17:55 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 89 | 86 | 100 | 100 |
| 29.09 07:19 | Qwen3.8-27B EXL3 6.0 bpw (ExLlamaV3) / low | 100 | 100 | 67 | 100 | 100 | 100 |
| 27.09 10:05 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:54 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 28.09 23:08 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 100 | 89 | 71 | 100 | 100 |
| 27.09 10:30 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 57 | 95 | 100 |
| 13.10 21:13 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 89 | 57 | 100 | 100 |
| 14.10 23:25 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 100 | 100 | 95 | 50 |
| 11.10 20:54 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 46 | 100 | 100 | 98 | 100 |
| 11.10 22:53 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 40 | 100 | 100 | 100 |
| 14.10 22:47 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 100 | 33 |
| 02.10 19:42 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / low | 100 | 100 | 100 | 100 | 98 | 33 |
| 12.10 18:37 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 98 | 33 |
| 06.10 19:15 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 60 | 62 | 100 | 100 | 98 | 100 |
| 27.09 10:42 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 17 |
| 28.09 22:36 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS (llama.cpp) / medium | 100 | 100 | 100 | 14 | 95 | 100 |
| 28.09 22:04 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / low | 100 | 20 | 89 | 100 | 98 | 100 |
| 11.10 12:16 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 100 | 100 | 100 | 0 (none) |
| 27.09 09:14 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 0 (limit) |
| 29.09 21:25 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (llama.cpp) / low | 100 | 100 | 100 | 100 | 98 | 0 (limit) |
| 29.09 22:23 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 98 | 0 (limit) |
| 02.10 23:08 | GLM-5.3-Flash GSQ-RCO 3.5-bit (llama.cpp) / high | 100 | 100 | 100 | 100 | 98 | 0 (time) |
| 30.09 06:40 | GLM-5.3-Flash GSQ-RCO 3.5-bit (llama.cpp) / high | 100 | 100 | 100 | 100 | 98 | 0 (time) |
| 28.09 18:25 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / high | 100 | 92 | 100 | 100 | 100 | 0 (time) |
| 28.09 20:34 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / high | 92 | 100 | 100 | 100 | 98 | 0 (time) |
| 09.10 13:41 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / low | 100 | 77 | 100 | 100 | 93 | 17 |
| 14.10 18:10 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 100 | 86 | 0 (time) |
| 05.10 23:18 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 62 | 100 | 100 | 98 | 17 |
| 13.10 19:24 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 46 | 100 | 100 | 91 | 33 |
| 29.09 07:25 | Qwen3.8-27B EXL3 6.0 bpw (ExLlamaV3) / medium | 100 | 100 | 67 | 100 | 100 | 0 (none) |
| 14.10 21:34 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 100 | 100 | 14 | 100 | 50 (time) |
| 30.09 00:28 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (llama.cpp) / medium | 60 | 100 | 100 | 100 | 100 | 0 (limit) |
| 02.10 21:41 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 57 | 100 | 0 (time) |
| 11.10 17:26 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 62 | 100 | 100 | 72 | 0 (none) |
| 13.10 23:43 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / xhigh | 100 | 100 | 100 | 100 | 0 (limit) | 33 |
| 29.09 18:22 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / low | 62 | 100 | 100 | 57 | 93 | 17 |
| 13.10 20:09 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 0 (none) | 100 | 17 |
| 27.09 10:18 | Qwen3.8-27B EXL3 3.0 bpw qv44 (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 0 (none) | 0 (none) |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
