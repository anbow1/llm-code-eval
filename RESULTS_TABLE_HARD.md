# Results table: hard suite (--suite hard)

6 tasks (3 × TypeScript + Three.js, 3 × Python). Base-suite results are in [RESULTS_TABLE.md](RESULTS_TABLE.md).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 65,536-token and 60-minute limit per task. Settings that were run more than once are averaged in the first table; every single run is listed in the second.

## Mean per setting

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 2 | **95.8%** | 93–98 | 19.9 | 44.1k | 37.3 | 26.5 |
| 2 | Qwen3.8-27B | ? | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **94.4%** | – | 6.5 | ~46.1k | 121.9 | 26.9 |
| 3 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 2 | **93.1%** | 92–94 | 11.0 | ~54.0k | 82.9 | 15.6 |
| 4 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | low | 2 | **90.3%** | 83–98 | 32.9 | 95.3k | 48.6 | 30.8 |
| 5 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **87.8%** | 83–94 | 17.8 | 67.4k | 63.9 | 15.4 |
| 6 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | medium | 3 | **86.5%** | 77–100 | 66.6 | 169.3k | 42.5 | 31.0 |
| 7 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **84.9%** | – | 29.2 | 54.0k | 31.0 | 24.5 |
| 8 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 1 | **82.9%** | – | 98.3 | ~80.2k | 13.6 | 31.0 |
| 9 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 2 | **81.9%** | 82–82 | 102.6 | ~65.9k | 10.7 | 30.2 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 2 | **77.9%** | 71–84 | 19.4 | ~13.2k | 11.6 | 30.2 |
| 11 | Qwen3.8-27B | ? | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **77.8%** | – | 10.4 | ~67.6k | 110.4 | 26.9 |
| 12 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | – | 10.9 | ~53.9k | 83.2 | 15.5 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 30.09 19:29 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 20.0 | 138.2k | 131.7k | 6.5k | **116.4** | 137 | 30.5 | 68.5 |
| 2 | 29.09 01:32 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **98.1%** | 100.0 | 96.3 | 17.6 | 39.3k | 32.2k | 7.0k | **37.7** | 40 | 26.5 | 96.7 |
| 3 | 30.09 19:20 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | low | **97.8%** | 99.2 | 96.3 | 8.4 | 70.4k | 64.4k | 5.9k | **142.1** | 147 | 30.5 | 67.9 |
| 4 | 29.09 07:19 | Qwen3.8-27B | ? | ExLlamaV3 | RTX 5090 32 GB | low | **94.4%** | 100.0 | 88.9 | 6.5 | ~46.1k | ~39.0k | ~7.0k | **122.3** | 132 | 26.9 | 19.8 |
| 5 | 27.09 10:05 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 11.4 | ~52.4k | ~45.4k | ~7.0k | **77.9** | 81 | 15.6 | 14.2 |
| 6 | 27.09 10:54 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 13.7 | 59.5k | 52.2k | 7.3k | **73.1** | 78 | 15.3 | 26.3 |
| 7 | 28.09 23:08 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **93.4%** | 90.5 | 96.3 | 22.2 | 48.9k | 41.2k | 7.7k | **37.1** | 40 | 26.4 | 92.7 |
| 8 | 27.09 10:30 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.1%** | 84.2 | 100.0 | 10.6 | ~55.5k | ~47.0k | ~8.5k | **88.5** | 91 | 15.6 | 15.4 |
| 9 | 27.09 10:42 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **86.1%** | 72.2 | 100.0 | 10.2 | 44.9k | 38.0k | 6.8k | **74.7** | 78 | 15.2 | 22.2 |
| 10 | 28.09 22:36 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **84.9%** | 69.9 | 100.0 | 29.2 | 54.0k | 46.9k | 7.1k | **31.0** | 32 | 24.5 | 58.8 |
| 11 | 28.09 22:04 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **84.4%** | 99.2 | 69.6 | 26.5 | ~17.3k | ~11.8k | ~5.5k | **11.1** | 14 | 30.2 | 115.6 |
| 12 | 27.09 09:14 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **83.3%** | 66.7 | 100.0 | 29.4 | 97.9k | 91.1k | 6.9k | **55.8** | 73 | 15.4 | 21.2 |
| 13 | 29.09 21:25 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | low | **82.9%** | 65.9 | 100.0 | 57.3 | 120.1k | 113.3k | 6.9k | **35.0** | 37 | 30.8 | 74.5 |
| 14 | 29.09 22:23 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | medium | **82.9%** | 65.9 | 100.0 | 62.6 | 132.1k | 125.6k | 6.5k | **35.3** | 37 | 30.8 | 77.3 |
| 15 | 30.09 06:40 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **82.9%** | 65.9 | 100.0 | 98.3 | ~80.2k | ~74.0k | ~6.1k | **13.6** | 14 | 31.0 | 127.0 |
| 16 | 28.09 18:25 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **82.1%** | 66.7 | 97.4 | 115.5 | ~73.6k | ~66.1k | ~7.5k | **10.6** | 12 | 26.9 | 122.0 |
| 17 | 28.09 20:34 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **81.7%** | 65.9 | 97.4 | 89.7 | ~58.1k | ~52.2k | ~5.9k | **10.8** | 12 | 30.2 | 115.0 |
| 18 | 29.09 07:25 | Qwen3.8-27B | ? | ExLlamaV3 | RTX 5090 32 GB | medium | **77.8%** | 66.7 | 88.9 | 10.4 | ~67.6k | ~61.1k | ~6.5k | **110.5** | 128 | 26.9 | 19.1 |
| 19 | 30.09 00:28 | Qwen3.8-Flash-Next | ? | llama.cpp | RTX 5090 32 GB | medium | **76.7%** | 66.7 | 86.7 | 117.3 | 237.4k | 229.8k | 7.6k | **33.8** | 36 | 31.0 | 79.6 |
| 20 | 29.09 18:22 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **71.4%** | 55.6 | 87.2 | 12.4 | 9.0k | 2.9k | 6.1k | **12.6** | 14 | 30.2 | 114.0 |
| 21 | 27.09 10:18 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | **66.7%** | 33.3 | 100.0 | 10.9 | ~53.9k | ~49.6k | ~4.3k | **83.4** | 88 | 15.5 | 14.7 |

## Score per task (%)

| Run | Model / effort | h_t1_physics | h_t2_instanced_pick | h_t3_postfx_invert | h_p1_interval_set | h_p2_expr_eval | h_p3_line_diff |
|---|---|---|---|---|---|---|---|
| 30.09 19:29 | Qwen3.8-Flash-Next ? / medium | 100 | 100 | 100 | 100 | 100 | 100 |
| 29.09 01:32 | Qwen3.8-Flash-Next UD-Q4_K_XL / medium | 100 | 100 | 89 | 100 | 100 | 100 |
| 30.09 19:20 | Qwen3.8-Flash-Next ? / low | 100 | 100 | 89 | 100 | 98 | 100 |
| 29.09 07:19 | Qwen3.8-27B ? / low | 100 | 100 | 67 | 100 | 100 | 100 |
| 27.09 10:05 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:54 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 28.09 23:08 | Qwen3.8-Flash-Next UD-Q4_K_XL / medium | 100 | 100 | 89 | 71 | 100 | 100 |
| 27.09 10:30 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 57 | 95 | 100 |
| 27.09 10:42 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 17 |
| 28.09 22:36 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / medium | 100 | 100 | 100 | 14 | 95 | 100 |
| 28.09 22:04 | GLM-5.3-Flash EXL3 3.05 bpw / low | 100 | 20 | 89 | 100 | 98 | 100 |
| 27.09 09:14 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 0 (limit) |
| 29.09 21:25 | Qwen3.8-Flash-Next ? / low | 100 | 100 | 100 | 100 | 98 | 0 (limit) |
| 29.09 22:23 | Qwen3.8-Flash-Next ? / medium | 100 | 100 | 100 | 100 | 98 | 0 (limit) |
| 30.09 06:40 | GLM-5.3-Flash GSQ-RCO 3.5-bit / high | 100 | 100 | 100 | 100 | 98 | 0 (time) |
| 28.09 18:25 | GLM-5.3-Flash EXL3 3.05 bpw / high | 100 | 92 | 100 | 100 | 100 | 0 (time) |
| 28.09 20:34 | GLM-5.3-Flash EXL3 3.05 bpw / high | 92 | 100 | 100 | 100 | 98 | 0 (time) |
| 29.09 07:25 | Qwen3.8-27B ? / medium | 100 | 100 | 67 | 100 | 100 | 0 (none) |
| 30.09 00:28 | Qwen3.8-Flash-Next ? / medium | 60 | 100 | 100 | 100 | 100 | 0 (limit) |
| 29.09 18:22 | GLM-5.3-Flash EXL3 3.05 bpw / low | 62 | 100 | 100 | 57 | 93 | 17 |
| 27.09 10:18 | Qwen3.8-27B EXL3 3.0 bpw qv44 / medium | 100 | 100 | 100 | 100 | 0 (none) | 0 (none) |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
