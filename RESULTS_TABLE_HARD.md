# Results table: hard suite (--suite hard)

6 tasks (3 × TypeScript + Three.js, 3 × Python). Base-suite results are in [RESULTS_TABLE.md](RESULTS_TABLE.md).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting", and ranked by their best run under "Best run per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | UD-Q5_K_XL | Strata | RTX 5090 32 GB | medium | 1 | **100.0%** | – | 100.0% | 0% | 8.0 | 46.1k | 98.6 | 30.7 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 2 | **100.0%** | 100–100 | 66.7% | 0% | 19.6 | 159.7k | 136.5 | 30.5 |
| 3 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 2 | **100.0%** | 100–100 | 66.7% | 0% | 61.4 | 96.3k | 26.2 | 31.3 |
| 4 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 2 | **100.0%** | 100–100 | 33.3% | 0% | 82.6 | 120.2k | 24.3 | 31.3 |
| 5 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB | low | 1 | **100.0%** | – | 16.7% | 0% | 123.1 | 84.2k | 11.4 | 31.3 |
| 6 | Qwen3.8-27B | GSQ-RCO IQ3_XXS MTP | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.3%** | – | 81.7% | 0% | 17.9 | 72.4k | 68.5 | 15.4 |
| 7 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 1 | **97.8%** | – | 97.8% | 0% | 8.4 | 70.4k | 141.3 | 30.5 |
| 8 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **97.6%** | – | 97.6% | 0% | 9.0 | 50.7k | 96.1 | 30.8 |
| 9 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB | medium | 2 | **96.6%** | 93–100 | 96.6% | 0% | 5.7 | 45.8k | 138.7 | 30.9 |
| 10 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **94.4%** | – | 94.4% | 0% | 6.5 | ~46.1k | 121.9 | 26.9 |
| 11 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 2 | **93.0%** | 86–100 | 84.8% | 0% | 15.7 | 75.4k | 81.1 | 31.3 |
| 12 | GLM-5.3-Flash | EXL3 4.05 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **92.9%** | – | 76.2% | 0% | 25.5 | 25.9k | 17.1 | 30.9 |
| 13 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **92.6%** | 92–94 | 92.6% | 0% | 10.2 | ~51.2k | 84.7 | 15.6 |
| 14 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 4 | **91.7%** | 81–98 | 79.3% | 4% | 45.4 | ~46.6k | 17.2 | 31.0 |
| 15 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 7 | **90.8%** | 83–100 | 76.1% | 5% | 47.5 | ~54.1k | 19.1 | 31.2 |
| 16 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 3 | **90.3%** | 79–98 | 90.3% | 0% | 18.7 | 41.1k | 37.0 | 30.4 |
| 17 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **88.5%** | – | 88.5% | 0% | 8.1 | 47.1k | 99.3 | 30.8 |
| 18 | GLM-5.3-Flash | EXL3 3.10 bpw | Maya | RTX 5090 32 GB | high | 1 | **88.5%** | – | 82.9% | 0% | 39.5 | 53.1k | 22.5 | 30.9 |
| 19 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **87.8%** | 83–94 | 87.8% | 6% | 17.8 | 67.4k | 63.9 | 15.4 |
| 20 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 4 | **86.5%** | 72–100 | 76.0% | 8% | 41.2 | ~57.5k | 23.4 | 31.2 |
| 21 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 7 | **86.0%** | 69–100 | 77.6% | 2% | 38.2 | ~45.4k | 19.9 | 31.2 |
| 22 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **84.9%** | – | 69.0% | 0% | 29.2 | 54.0k | 31.0 | 24.5 |
| 23 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **83.9%** | – | 83.9% | 0% | 15.3 | 75.0k | 82.8 | 14.1 |
| 24 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | 1 | **82.9%** | – | 66.3% | 17% | 57.3 | 120.1k | 35.1 | 30.8 |
| 25 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 2 | **82.9%** | 83–83 | 74.6% | 17% | 91.3 | ~74.5k | 13.6 | 31.0 |
| 26 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 1 | **81.1%** | – | 81.1% | 0% | 8.7 | 7.9k | 15.5 | 30.9 |
| 27 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 3 | **80.0%** | 76–82 | 68.9% | 17% | 95.7 | ~61.1k | 10.7 | 30.2 |
| 28 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 2 | **79.8%** | 77–83 | 54.8% | 17% | 90.0 | 184.8k | 34.3 | 31.0 |
| 29 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **77.9%** | 71–84 | 69.6% | 0% | 19.4 | ~13.2k | 11.6 | 30.2 |
| 30 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **77.8%** | – | 77.8% | 17% | 10.4 | ~67.6k | 110.4 | 26.9 |
| 31 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | 1 | **72.2%** | – | 16.7% | 17% | 25.3 | 233.2k | 154.8 | 30.0 |
| 32 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | – | 66.7% | 33% | 10.9 | ~53.9k | 83.2 | 15.5 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped mid-thought).

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 1 | 2 | **100.0%** | 0.0 | 100.0% | 6/6 | 0% | 0/6 | – |
| DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 1 | 2 | **100.0%** | 0.0 | 100.0% | 6/6 | 0% | 0/6 | – |
| DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | 2 | **100.0%** | 0.0 | 100.0% | 6/6 | 0% | 0/6 | – |
| Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB | medium | 1 | 2 | **96.6%** | 4.8 | 93.2% | 4/6 | 0% | 0/6 | – |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 1 | 2 | **93.0%** | 9.3 | 86.5% | 3/6 | 0% | 0/6 | – |
| Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | 3 | **92.6%** | 1.3 | 91.7% | 3/6 | 0% | 0/6 | h_p3_line_diff 2/3 (wrong 2) |
| GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 4 | **91.7%** | 7.9 | 81.0% | 1/6 | 4% | 0/6 | – |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 1 | 7 | **90.8%** | 5.6 | 83.3% | 1/6 | 5% | 0/6 | – |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 1 | 3 | **90.3%** | 9.8 | 79.3% | 1/6 | 0% | 0/6 | h_t3_postfx_invert 2/3 (wrong 2) |
| Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 1 | 3 | **87.8%** | 5.6 | 83.3% | 4/6 | 6% | 0/6 | h_p3_line_diff 3/3 (wrong 2, limit 1) |
| GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 1 | 4 | **86.5%** | 13.7 | 72.3% | 2/6 | 8% | 0/6 | h_p3_line_diff 2/4 (time 1, none 1); h_t2_instanced_pick 2/4 (wrong 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 1 | 7 | **86.0%** | 9.7 | 69.4% | 1/6 | 2% | 0/6 | h_p3_line_diff 5/7 (wrong 5) |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 1 | 2 | **82.9%** | 0.0 | 82.9% | 4/6 | 17% | 0/6 | h_p3_line_diff 2/2 (time 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | 3 | **80.0%** | 3.3 | 76.2% | 1/6 | 17% | 0/6 | h_p3_line_diff 3/3 (time 3) |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 1 | 2 | **79.8%** | 4.4 | 76.7% | 3/6 | 17% | 0/6 | h_p3_line_diff 2/2 (limit 2) |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | 2 | **77.9%** | 9.2 | 71.4% | 0/6 | 0% | 0/6 | – |

## Best run per setting

Ranked by each setting's single best run (on a tie, the faster one). Compare with the mean above: a setting that is high here but lower there is good on a lucky run, not every run.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Best score | Best run | Time (min) | Tokens | Avg tok/s (from time) | Mean of all runs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB | medium | 2 | **100.0%** | 20.10 21:54 | 5.7 | 45.5k | 136.7 | 96.6% |
| 2 | Qwen3.8-Flash-Next | UD-Q5_K_XL | Strata | RTX 5090 32 GB | medium | 1 | **100.0%** | 20.10 22:49 | 8.0 | 46.1k | 98.7 | 100.0% |
| 3 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | 2 | **100.0%** | 13.10 23:24 | 19.3 | 181.2k | 157.6 | 100.0% |
| 4 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | 7 | **100.0%** | 14.10 20:54 | 35.3 | 46.1k | 21.9 | 86.0% |
| 5 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | 4 | **100.0%** | 12.10 19:23 | 38.8 | 53.7k | 23.1 | 86.5% |
| 6 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 2 | **100.0%** | 24.10 14:33 | 53.7 | 83.2k | 25.9 | 100.0% |
| 7 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 2 | **100.0%** | 24.10 11:13 | 77.7 | 109.2k | 23.5 | 100.0% |
| 8 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB | low | 1 | **100.0%** | 21.10 19:47 | 123.1 | 84.2k | 11.4 | 100.0% |
| 9 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | 2 | **99.6%** | 06.10 19:39 | 7.7 | 40.3k | 89.5 | 93.0% |
| 10 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | 7 | **99.6%** | 18.10 21:33 | 29.9 | 40.1k | 22.5 | 90.8% |
| 11 | Qwen3.8-27B | GSQ-RCO IQ3_XXS MTP | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.3%** | 15.10 22:19 | 17.9 | 72.4k | 68.4 | 98.3% |
| 12 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 3 | **98.1%** | 29.09 01:32 | 17.6 | 39.3k | 37.7 | 90.3% |
| 13 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 4 | **98.1%** | 22.10 23:04 | 35.2 | 47.8k | 22.7 | 91.7% |
| 14 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | 1 | **97.8%** | 30.09 19:20 | 8.4 | 70.4k | 142.1 | 97.8% |
| 15 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **97.6%** | 02.10 20:00 | 9.0 | 50.7k | 96.1 | 97.6% |
| 16 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **94.4%** | 29.09 07:19 | 6.5 | ~46.1k | 122.3 | 94.4% |
| 17 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **94.1%** | 27.09 10:05 | 11.4 | ~52.4k | 77.9 | 92.6% |
| 18 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **94.1%** | 27.09 10:54 | 13.7 | 59.5k | 73.1 | 87.8% |
| 19 | GLM-5.3-Flash | EXL3 4.05 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **92.9%** | 23.10 21:22 | 25.5 | 25.9k | 17.1 | 92.9% |
| 20 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **88.5%** | 02.10 19:42 | 8.1 | 47.1k | 99.7 | 88.5% |
| 21 | GLM-5.3-Flash | EXL3 3.10 bpw | Maya | RTX 5090 32 GB | high | 1 | **88.5%** | 18.10 22:42 | 39.5 | 53.1k | 22.5 | 88.5% |
| 22 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **84.9%** | 28.09 22:36 | 29.2 | 54.0k | 31.0 | 84.9% |
| 23 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **84.4%** | 28.09 22:04 | 26.5 | ~17.3k | 11.1 | 77.9% |
| 24 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **83.9%** | 16.10 11:11 | 15.3 | 75.0k | 82.9 | 83.9% |
| 25 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | 1 | **82.9%** | 29.09 21:25 | 57.3 | 120.1k | 35.0 | 82.9% |
| 26 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | 2 | **82.9%** | 29.09 22:23 | 62.6 | 132.1k | 35.3 | 79.8% |
| 27 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 2 | **82.9%** | 02.10 23:08 | 84.4 | ~68.9k | 13.6 | 82.9% |
| 28 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 3 | **82.1%** | 28.09 18:25 | 115.5 | ~73.6k | 10.6 | 80.0% |
| 29 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | 1 | **81.1%** | 09.10 13:41 | 8.7 | 7.9k | 15.4 | 81.1% |
| 30 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **77.8%** | 29.09 07:25 | 10.4 | ~67.6k | 110.5 | 77.8% |
| 31 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | 1 | **72.2%** | 13.10 23:43 | 25.3 | 233.2k | 154.7 | 72.2% |
| 32 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | 27.09 10:18 | 10.9 | ~53.9k | 83.4 | 66.7% |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20.10 21:54 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 5.7 | 45.5k | 39.3k | 6.2k | **136.7** | 144 | 30.7 | 81.4 |
| 2 | 20.10 22:49 | Qwen3.8-Flash-Next | UD-Q5_K_XL | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 8.0 | 46.1k | 39.4k | 6.7k | **98.7** | 102 | 30.7 | 109.8 |
| 3 | 13.10 23:24 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 19.3 | 181.2k | 173.0k | 8.2k | **157.6** | 184 | 30.0 | 67.7 |
| 4 | 30.09 19:29 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 20.0 | 138.2k | 131.7k | 6.5k | **116.4** | 137 | 30.5 | 68.5 |
| 5 | 14.10 20:54 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 35.3 | 46.1k | 38.1k | 8.0k | **21.9** | 22 | 31.1 | 109.9 |
| 6 | 12.10 19:23 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **100.0%** | 100.0 | 100.0 | 38.8 | 53.7k | 47.1k | 6.6k | **23.1** | 23 | 31.2 | 101.1 |
| 7 | 24.10 14:33 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | 100.0 | 100.0 | 53.7 | 83.2k | 75.7k | 7.5k | **25.9** | 27 | 31.3 | 175.3 |
| 8 | 24.10 09:47 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | 100.0 | 100.0 | 69.0 | 109.3k | 102.0k | 7.3k | **26.5** | 27 | 31.2 | 172.2 |
| 9 | 24.10 11:13 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | 100.0 | 100.0 | 77.7 | 109.2k | 101.0k | 8.2k | **23.5** | 23 | 31.3 | 170.8 |
| 10 | 23.10 23:08 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | 100.0 | 100.0 | 87.5 | 131.2k | 121.6k | 9.6k | **25.1** | 25 | 31.1 | 169.7 |
| 11 | 21.10 19:47 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 123.1 | 84.2k | 75.9k | 8.3k | **11.4** | 11 | 31.3 | 127.1 |
| 12 | 06.10 19:39 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **99.6%** | 99.2 | 100.0 | 7.7 | 40.3k | 33.7k | 6.6k | **89.5** | 93 | 31.2 | 75.6 |
| 13 | 18.10 21:33 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **99.6%** | 99.2 | 100.0 | 29.9 | 40.1k | 32.6k | 7.5k | **22.5** | 23 | 30.7 | 114.7 |
| 14 | 15.10 22:19 | Qwen3.8-27B | GSQ-RCO IQ3_XXS MTP | llama.cpp | RTX 4080 16 GB | medium | **98.3%** | 99.2 | 97.4 | 17.9 | 72.4k | 64.7k | 7.7k | **68.4** | 75 | 15.4 | 23.3 |
| 15 | 29.09 01:32 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **98.1%** | 100.0 | 96.3 | 17.6 | 39.3k | 32.2k | 7.0k | **37.7** | 40 | 26.5 | 96.7 |
| 16 | 22.10 23:04 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **98.1%** | 100.0 | 96.3 | 35.2 | 47.8k | 41.3k | 6.5k | **22.7** | 23 | 30.7 | 113.2 |
| 17 | 30.09 19:20 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | low | **97.8%** | 99.2 | 96.3 | 8.4 | 70.4k | 64.4k | 5.9k | **142.1** | 147 | 30.5 | 67.9 |
| 18 | 02.10 20:00 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 95.2 | 100.0 | 9.0 | 50.7k | 43.3k | 7.5k | **96.1** | 102 | 30.8 | 42.5 |
| 19 | 14.10 19:28 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **97.2%** | 94.5 | 100.0 | 39.2 | 33.8k | 26.5k | 7.4k | **14.5** | 14 | 30.0 | 109.7 |
| 20 | 11.10 13:24 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **96.3%** | 99.2 | 93.3 | 36.0 | 50.1k | 43.4k | 6.7k | **23.3** | 23 | 31.1 | 100.2 |
| 21 | 11.10 17:55 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **95.8%** | 95.2 | 96.3 | 71.0 | 67.6k | 60.5k | 7.0k | **15.9** | 15 | 31.2 | 115.1 |
| 22 | 29.09 07:19 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **94.4%** | 100.0 | 88.9 | 6.5 | ~46.1k | ~39.0k | ~7.0k | **122.3** | 132 | 26.9 | 19.8 |
| 23 | 27.09 10:05 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 11.4 | ~52.4k | ~45.4k | ~7.0k | **77.9** | 81 | 15.6 | 14.2 |
| 24 | 27.09 10:54 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 13.7 | 59.5k | 52.2k | 7.3k | **73.1** | 78 | 15.3 | 26.3 |
| 25 | 28.09 23:08 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **93.4%** | 90.5 | 96.3 | 22.2 | 48.9k | 41.2k | 7.7k | **37.1** | 40 | 26.4 | 92.7 |
| 26 | 19.10 22:09 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB | medium | **93.2%** | 99.2 | 87.2 | 5.7 | 46.1k | 38.9k | 7.2k | **139.4** | 145 | 30.9 | 82.5 |
| 27 | 23.10 21:22 | GLM-5.3-Flash | EXL3 4.05 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | **92.9%** | 85.7 | 100.0 | 25.5 | 25.9k | 18.8k | 7.1k | **17.1** | 18 | 30.9 | 150.1 |
| 28 | 27.09 10:30 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.1%** | 84.2 | 100.0 | 10.6 | ~55.5k | ~47.0k | ~8.5k | **88.5** | 91 | 15.6 | 15.4 |
| 29 | 16.10 11:28 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **91.7%** | 83.3 | 100.0 | 8.7 | 45.5k | 39.4k | 6.1k | **89.2** | 96 | 14.3 | 13.6 |
| 30 | 13.10 21:13 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **91.0%** | 85.7 | 96.3 | 41.5 | 47.0k | 40.0k | 7.0k | **18.9** | 19 | 31.1 | 111.4 |
| 31 | 14.10 23:25 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.9%** | 81.8 | 100.0 | 40.6 | 55.2k | 48.3k | 6.9k | **22.7** | 23 | 31.0 | 113.8 |
| 32 | 19.10 19:48 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **90.6%** | 99.2 | 82.1 | 28.7 | 38.9k | 32.0k | 6.9k | **22.8** | 23 | 31.0 | 116.2 |
| 33 | 11.10 20:54 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.6%** | 99.2 | 82.1 | 67.7 | 59.1k | 52.0k | 7.1k | **14.6** | 14 | 31.1 | 114.7 |
| 34 | 11.10 22:53 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **90.0%** | 100.0 | 80.0 | 53.5 | 74.0k | 48.6k | 25.4k | **23.2** | 23 | 31.1 | 100.1 |
| 35 | 14.10 22:47 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **88.9%** | 77.8 | 100.0 | 35.0 | 46.0k | 38.1k | 7.9k | **22.0** | 22 | 31.1 | 109.8 |
| 36 | 02.10 19:42 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | **88.5%** | 77.0 | 100.0 | 8.1 | 47.1k | 40.2k | 6.9k | **99.7** | 106 | 30.8 | 38.9 |
| 37 | 18.10 22:42 | GLM-5.3-Flash | EXL3 3.10 bpw | Maya | RTX 5090 32 GB | high | **88.5%** | 77.0 | 100.0 | 39.5 | 53.1k | 45.9k | 7.2k | **22.5** | 23 | 30.9 | 113.8 |
| 38 | 12.10 18:37 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **88.5%** | 77.0 | 100.0 | 41.4 | 47.9k | 40.3k | 7.5k | **19.4** | 20 | 31.2 | 109.4 |
| 39 | 06.10 19:15 | Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | RTX 5090 32 GB | medium | **86.5%** | 99.2 | 73.8 | 23.7 | 110.6k | 103.2k | 7.3k | **78.5** | 92 | 31.3 | 73.0 |
| 40 | 27.09 10:42 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **86.1%** | 72.2 | 100.0 | 10.2 | 44.9k | 38.0k | 6.8k | **74.7** | 78 | 15.2 | 22.2 |
| 41 | 18.10 22:09 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **85.8%** | 77.8 | 93.7 | 20.8 | 28.2k | 20.9k | 7.2k | **22.8** | 23 | 30.8 | 109.6 |
| 42 | 23.10 08:04 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **85.7%** | 71.4 | 100.0 | 50.1 | 60.0k | 53.2k | 6.8k | **20.1** | 20 | 30.8 | 113.6 |
| 43 | 28.09 22:36 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **84.9%** | 69.9 | 100.0 | 29.2 | 54.0k | 46.9k | 7.1k | **31.0** | 32 | 24.5 | 58.8 |
| 44 | 28.09 22:04 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **84.4%** | 99.2 | 69.6 | 26.5 | ~17.3k | ~11.8k | ~5.5k | **11.1** | 14 | 30.2 | 115.6 |
| 45 | 16.10 11:11 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **83.9%** | 71.4 | 96.3 | 15.3 | 75.0k | 68.0k | 7.0k | **82.9** | 87 | 14.1 | 14.8 |
| 46 | 11.10 12:16 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | high | **83.3%** | 66.7 | 100.0 | 19.6 | ~22.7k | ~16.2k | ~6.5k | **19.4** | 20 | 31.1 | 114.4 |
| 47 | 27.09 09:14 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **83.3%** | 66.7 | 100.0 | 29.4 | 97.9k | 91.1k | 6.9k | **55.8** | 73 | 15.4 | 21.2 |
| 48 | 29.09 21:25 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | low | **82.9%** | 65.9 | 100.0 | 57.3 | 120.1k | 113.3k | 6.9k | **35.0** | 37 | 30.8 | 74.5 |
| 49 | 29.09 22:23 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | **82.9%** | 65.9 | 100.0 | 62.6 | 132.1k | 125.6k | 6.5k | **35.3** | 37 | 30.8 | 77.3 |
| 50 | 02.10 23:08 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **82.9%** | 65.9 | 100.0 | 84.4 | ~68.9k | ~62.5k | ~6.4k | **13.6** | 14 | 29.8 | 127.0 |
| 51 | 30.09 06:40 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **82.9%** | 65.9 | 100.0 | 98.3 | ~80.2k | ~74.0k | ~6.1k | **13.6** | 14 | 31.0 | 127.0 |
| 52 | 28.09 18:25 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **82.1%** | 66.7 | 97.4 | 115.5 | ~73.6k | ~66.1k | ~7.5k | **10.6** | 12 | 26.9 | 122.0 |
| 53 | 28.09 20:34 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **81.7%** | 65.9 | 97.4 | 89.7 | ~58.1k | ~52.2k | ~5.9k | **10.8** | 12 | 30.2 | 115.0 |
| 54 | 09.10 13:41 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | low | **81.1%** | 69.9 | 92.3 | 8.7 | 7.9k | 2.4k | 5.5k | **15.4** | 17 | 30.9 | 118.2 |
| 55 | 14.10 18:10 | GLM-5.3-Flash | EXL3 3.10 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **81.0%** | 62.0 | 100.0 | 78.4 | ~65.9k | ~59.9k | ~6.0k | **14.0** | 14 | 30.0 | 108.6 |
| 56 | 05.10 23:18 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **79.3%** | 71.4 | 87.2 | 16.4 | 35.1k | 28.0k | 7.1k | **36.1** | 39 | 30.4 | 95.0 |
| 57 | 13.10 19:24 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **78.4%** | 74.7 | 82.1 | 45.1 | 52.0k | 45.2k | 6.8k | **19.3** | 19 | 31.1 | 112.6 |
| 58 | 29.09 07:25 | Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **77.8%** | 66.7 | 88.9 | 10.4 | ~67.6k | ~61.1k | ~6.5k | **110.5** | 128 | 26.9 | 19.1 |
| 59 | 14.10 21:34 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **77.4%** | 54.8 | 100.0 | 69.1 | ~99.8k | ~42.6k | ~57.3k | **24.1** | 25 | 31.1 | 100.0 |
| 60 | 30.09 00:28 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | RTX 5090 32 GB | medium | **76.7%** | 66.7 | 86.7 | 117.3 | 237.4k | 229.8k | 7.6k | **33.8** | 36 | 31.0 | 79.6 |
| 61 | 02.10 21:41 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **76.2%** | 52.4 | 100.0 | 81.8 | ~51.7k | ~46.4k | ~5.3k | **10.6** | 13 | 30.2 | 116.4 |
| 62 | 11.10 17:26 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | high | **72.3%** | 57.4 | 87.2 | 20.8 | ~26.6k | ~18.8k | ~7.8k | **21.5** | 22 | 31.2 | 102.0 |
| 63 | 13.10 23:43 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | RTX 5090 32 GB | xhigh | **72.2%** | 44.4 | 100.0 | 25.3 | 233.2k | 225.5k | 7.6k | **154.7** | 157 | 30.0 | 67.5 |
| 64 | 29.09 18:22 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **71.4%** | 55.6 | 87.2 | 12.4 | 9.0k | 2.9k | 6.1k | **12.6** | 14 | 30.2 | 114.0 |
| 65 | 13.10 20:09 | GLM-5.3-Flash | EXL3 3.05 bpw | Maya | RTX 5090 32 GB | high | **69.4%** | 38.9 | 100.0 | 48.4 | ~50.3k | ~43.1k | ~7.2k | **17.4** | 17 | 31.1 | 111.7 |
| 66 | 27.09 10:18 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | **66.7%** | 33.3 | 100.0 | 10.9 | ~53.9k | ~49.6k | ~4.3k | **83.4** | 88 | 15.5 | 14.7 |

## Score per task (%)

| Run | Model / effort | h_t1_physics | h_t2_instanced_pick | h_t3_postfx_invert | h_p1_interval_set | h_p2_expr_eval | h_p3_line_diff |
|---|---|---|---|---|---|---|---|
| 20.10 21:54 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 20.10 22:49 | Qwen3.8-Flash-Next UD-Q5_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 13.10 23:24 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 30.09 19:29 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 14.10 20:54 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 12.10 19:23 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 24.10 14:33 | DeepSeek-V4.1-Flash GSQ-RCO IQ2_XS (Strata) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 24.10 09:47 | DeepSeek-V4.1-Flash GSQ-RCO IQ2_XS (Strata) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 24.10 11:13 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 23.10 23:08 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 100 | 100 | 100 | 100 | 100 | 100 |
| 21.10 19:47 | DeepSeek-V4.1-Flash Maya-S (Maya) / low | 100 | 100 | 100 | 100 | 100 | 100 |
| 06.10 19:39 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 100 | 100 | 100 | 100 | 98 | 100 |
| 18.10 21:33 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 100 | 100 | 98 | 100 |
| 15.10 22:19 | Qwen3.8-27B GSQ-RCO IQ3_XXS MTP (llama.cpp) / medium | 100 | 92 | 100 | 100 | 98 | 100 |
| 29.09 01:32 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 100 | 89 | 100 | 100 | 100 |
| 22.10 23:04 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 100 | 89 | 100 | 100 | 100 |
| 30.09 19:20 | Qwen3.8-Flash-Next GSQ-RCO IQ3_S (Strata) / low | 100 | 100 | 89 | 100 | 98 | 100 |
| 02.10 20:00 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / medium | 100 | 100 | 100 | 86 | 100 | 100 |
| 14.10 19:28 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 100 | 100 | 86 | 98 | 100 |
| 11.10 13:24 | GLM-5.3-Flash derisked Maya-M (Maya) / high | 100 | 80 | 100 | 100 | 98 | 100 |
| 11.10 17:55 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 89 | 86 | 100 | 100 |
| 29.09 07:19 | Qwen3.8-27B EXL3 6.0 bpw (ExLlamaV3) / low | 100 | 100 | 67 | 100 | 100 | 100 |
| 27.09 10:05 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:54 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 28.09 23:08 | Qwen3.8-Flash-Next UD-Q4_K_XL (llama.cpp) / medium | 100 | 100 | 89 | 71 | 100 | 100 |
| 19.10 22:09 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 100 | 62 | 100 | 100 | 98 | 100 |
| 23.10 21:22 | GLM-5.3-Flash EXL3 4.05 bpw (Maya) / high | 100 | 100 | 100 | 57 | 100 | 100 |
| 27.09 10:30 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 57 | 95 | 100 |
| 16.10 11:28 | Qwen3.8-27B EXL3 3.0 bpw (ExLlamaV3) / medium | 100 | 100 | 100 | 100 | 100 | 50 |
| 13.10 21:13 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 89 | 57 | 100 | 100 |
| 14.10 23:25 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 100 | 100 | 95 | 50 |
| 19.10 19:48 | GLM-5.3-Flash EXL3 3.10 bpw (ExLlamaV3) / high | 100 | 46 | 100 | 100 | 98 | 100 |
| 11.10 20:54 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 46 | 100 | 100 | 98 | 100 |
| 11.10 22:53 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 40 | 100 | 100 | 100 |
| 14.10 22:47 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 100 | 33 |
| 02.10 19:42 | Qwen3.8-27B UD-Q6_K_M (llama.cpp) / low | 100 | 100 | 100 | 100 | 98 | 33 |
| 18.10 22:42 | GLM-5.3-Flash EXL3 3.10 bpw (Maya) / high | 100 | 100 | 100 | 100 | 98 | 33 |
| 12.10 18:37 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 100 | 100 | 100 | 98 | 33 |
| 06.10 19:15 | Qwen3.8-Flash-Next UD-Q4_K_XL (Strata) / medium | 60 | 62 | 100 | 100 | 98 | 100 |
| 27.09 10:42 | Qwen3.8-27B AP IQ3_S (llama.cpp) / medium | 100 | 100 | 100 | 100 | 100 | 17 |
| 18.10 22:09 | GLM-5.3-Flash EXL3 3.05 bpw (Maya) / high | 100 | 92 | 89 | 100 | 100 | 33 |
| 23.10 08:04 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 100 | 100 | 100 | 100 | 98 | 17 |
| 28.09 22:36 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS (llama.cpp) / medium | 100 | 100 | 100 | 14 | 95 | 100 |
| 28.09 22:04 | GLM-5.3-Flash EXL3 3.05 bpw (ExLlamaV3) / low | 100 | 20 | 89 | 100 | 98 | 100 |
| 16.10 11:11 | Qwen3.8-27B EXL3 2.2 bpw (ExLlamaV3) / medium | 100 | 100 | 89 | 100 | 98 | 17 |
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
