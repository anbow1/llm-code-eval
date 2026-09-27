# Results table

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 65,536-token and 60-minute limit per task. Settings that were run more than once are averaged in the first table of each suite; every single run is listed in the second.

## Hard suite (--suite hard)

6 tasks (3 × TypeScript + Three.js, 3 × Python).

Mean per setting:

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 2 | **93.1%** | 92–94 | 11.0 | 18.4k | 28.3 | 15.6 |
| 2 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **87.8%** | 83–94 | 17.8 | 67.4k | 63.9 | 15.4 |
| 3 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | – | 10.9 | 18.2k | 28.1 | 15.5 |

Every run:

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 27.09 10:05 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 11.4 | 18.3k | 15.8k | 2.5k | **27.2** | 41 | 15.6 | 14.2 |
| 2 | 27.09 10:54 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 13.7 | 59.5k | 52.2k | 7.3k | **73.1** | 78 | 15.3 | 26.3 |
| 3 | 27.09 10:30 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.1%** | 84.2 | 100.0 | 10.6 | 18.5k | 15.4k | 3.1k | **29.5** | 45 | 15.6 | 15.4 |
| 4 | 27.09 10:42 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **86.1%** | 72.2 | 100.0 | 10.2 | 44.9k | 38.0k | 6.8k | **74.7** | 78 | 15.2 | 22.2 |
| 5 | 27.09 09:14 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **83.3%** | 66.7 | 100.0 | 29.4 | 97.9k | 91.1k | 6.9k | **55.8** | 73 | 15.4 | 21.2 |
| 6 | 27.09 10:18 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | **66.7%** | 33.3 | 100.0 | 10.9 | 18.2k | 16.0k | 2.2k | **28.2** | 41 | 15.5 | 14.7 |

Score per task (%):

| Run | Model / effort | h_t1_physics | h_t2_instanced_pick | h_t3_postfx_invert | h_p1_interval_set | h_p2_expr_eval | h_p3_line_diff |
|---|---|---|---|---|---|---|---|
| 27.09 10:05 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:54 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:30 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 57 | 95 | 100 |
| 27.09 10:42 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 17 |
| 27.09 09:14 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 0 (limit) |
| 27.09 10:18 | Qwen3.8-27B EXL3 3.0 bpw qv44 / medium | 100 | 100 | 100 | 100 | 0 (none) | 0 (none) |

## Base suite

10 tasks (6 × TypeScript + Three.js, 4 × Python).

Mean per setting:

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | 1 | **100.0%** | – | 4.7 | 28.7k | 108.6 | 29.8 |
| 2 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 2 | **100.0%** | 100–100 | 8.2 | 34.6k | 73.0 | 15.3 |
| 3 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | 1 | **100.0%** | – | 54.6 | 72.1k | 22.1 | 24.6 |
| 4 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | 1 | **99.5%** | – | 20.5 | 15.0k | 12.4 | 27.0 |
| 5 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | 1 | **99.2%** | – | 29.5 | 55.4k | 31.6 | 26.8 |
| 6 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | 1 | **98.6%** | – | 3.9 | 22.2k | 105.9 | 29.8 |
| 7 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 3 | **98.5%** | 96–100 | 7.3 | 24.1k | 58.2 | 15.6 |
| 8 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.2%** | – | 8.8 | 37.2k | 73.9 | 14.8 |
| 9 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 1 | **98.2%** | – | 9.5 | 37.7k | 68.3 | 15.6 |
| 10 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | low | 1 | **97.5%** | – | 12.3 | 46.8k | 65.1 | 14.8 |
| 11 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | medium | 1 | **95.7%** | – | 7.9 | 29.8k | 66.2 | 15.5 |
| 12 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | 1 | **93.9%** | – | 18.8 | 13.5k | 12.4 | 30.8 |
| 13 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | low | 1 | **92.9%** | – | 10.5 | 40.2k | 65.7 | 15.5 |
| 14 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | default (xhigh) | 1 | **92.9%** | – | 37.5 | 194.0k | 87.1 | 30.0 |
| 15 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | 2 | **90.9%** | 89–93 | 8.2 | 34.0k | 71.7 | 15.3 |
| 16 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **90.7%** | 84–100 | 12.9 | ~29.2k | 38.8 | 15.6 |
| 17 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | 1 | **90.6%** | – | 12.8 | 25.0k | 33.7 | 29.3 |
| 18 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | medium | 1 | **88.3%** | – | 9.2 | 38.3k | 74.3 | 15.1 |
| 19 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | 3 | **87.8%** | 78–94 | 9.6 | 26.5k | 50.9 | 14.9 |
| 20 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | low | 1 | **87.5%** | – | 68.2 | 87.6k | 21.5 | 24.6 |
| 21 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | max | 1 | **87.5%** | – | 205.8 | ~65.8k | 5.3 | 27.0 |
| 22 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | low | 1 | **86.3%** | – | 10.6 | 45.0k | 75.0 | 15.1 |
| 23 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 3 | **86.3%** | 81–93 | 8.3 | 28.2k | 60.6 | 15.0 |
| 24 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | low | 1 | **83.8%** | – | 12.1 | 47.2k | 68.4 | 15.6 |
| 25 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | 1 | **82.9%** | – | 13.7 | 9.6k | 11.9 | 27.0 |
| 26 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | default (xhigh) | 1 | **79.2%** | – | 84.7 | ~53.6k | 10.6 | 29.4 |

Every run:

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 25.09 16:11 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 4.7 | 28.7k | 21.9k | 6.8k | **108.9** | 121 | 29.8 | 39.8 |
| 2 | 27.09 08:41 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 7.7 | 32.3k | 24.8k | 7.5k | **73.6** | 79 | 15.3 | 25.7 |
| 3 | 27.09 07:52 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **100.0%** | 100.0 | 100.0 | 8.6 | 23.6k | 17.7k | 5.9k | **47.5** | 88 | 15.5 | 14.7 |
| 4 | 26.09 21:05 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 8.8 | 36.9k | 29.3k | 7.6k | **72.6** | 79 | 15.2 | 27.0 |
| 5 | 27.09 08:15 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **100.0%** | 100.0 | 100.0 | 18.3 | 26.8k | 20.6k | 6.2k | **24.9** | 81 | 15.6 | 15.0 |
| 6 | 25.09 17:37 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 54.6 | 72.1k | 64.4k | 7.8k | **22.2** | 23 | 24.6 | 67.3 |
| 7 | 25.09 09:26 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **99.5%** | 99.1 | 100.0 | 20.5 | 15.0k | 7.8k | 7.2k | **12.4** | 14 | 27.0 | 117.7 |
| 8 | 25.09 23:45 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **99.2%** | 100.0 | 98.5 | 29.5 | 55.4k | 47.7k | 7.8k | **31.7** | 39 | 26.8 | 101.3 |
| 9 | 27.09 08:08 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **99.1%** | 98.1 | 100.0 | 6.5 | 23.7k | 18.2k | 5.5k | **64.5** | 85 | 15.6 | 14.8 |
| 10 | 25.09 16:15 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | **98.6%** | 97.2 | 100.0 | 3.9 | 22.2k | 14.1k | 8.1k | **105.3** | 120 | 29.8 | 39.7 |
| 11 | 26.09 20:45 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | medium | **98.2%** | 96.4 | 100.0 | 8.8 | 37.2k | 29.6k | 7.6k | **73.5** | 80 | 14.8 | 26.2 |
| 12 | 27.09 09:03 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **98.2%** | 96.4 | 100.0 | 9.5 | 37.7k | 29.2k | 8.5k | **68.6** | 77 | 15.6 | 26.3 |
| 13 | 26.09 20:33 | Qwen3.8-27B | AP IQ3_XS | llama.cpp | RTX 4080 16 GB | low | **97.5%** | 95.0 | 100.0 | 12.3 | 46.8k | 39.4k | 7.5k | **65.3** | 79 | 14.8 | 24.0 |
| 14 | 26.09 23:20 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **96.4%** | 92.9 | 100.0 | 6.7 | 25.0k | 18.7k | 6.3k | **65.9** | 92 | 15.4 | 13.7 |
| 15 | 26.09 20:22 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | medium | **95.7%** | 92.9 | 98.6 | 7.9 | 29.8k | 21.9k | 7.9k | **66.1** | 73 | 15.5 | 27.4 |
| 16 | 25.09 22:47 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **93.9%** | 100.0 | 87.9 | 18.8 | 13.5k | 6.4k | 7.2k | **12.4** | 14 | 30.8 | 127.1 |
| 17 | 26.09 23:01 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **93.6%** | 87.2 | 100.0 | 6.1 | 25.6k | 20.4k | 5.3k | **74.7** | 87 | 14.1 | 13.5 |
| 18 | 26.09 20:55 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | **93.3%** | 86.5 | 100.0 | 9.7 | 41.0k | 33.5k | 7.5k | **73.0** | 78 | 15.2 | 24.2 |
| 19 | 26.09 20:12 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | llama.cpp | RTX 4080 16 GB | low | **92.9%** | 85.7 | 100.0 | 10.5 | 40.2k | 33.2k | 7.1k | **66.0** | 74 | 15.5 | 24.6 |
| 20 | 25.09 15:26 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | default (xhigh) | **92.9%** | 85.7 | 100.0 | 37.5 | 194.0k | 184.8k | 9.2k | **87.1** | 94 | 30.0 | 39.7 |
| 21 | 27.09 07:19 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.6%** | 97.2 | 88.1 | 6.4 | 24.6k | 19.4k | 5.2k | **70.2** | 82 | 14.2 | 15.5 |
| 22 | 27.09 07:27 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **91.2%** | 89.3 | 93.1 | 12.4 | 24.4k | 18.9k | 5.5k | **34.3** | 81 | 14.9 | 15.4 |
| 23 | 25.09 20:59 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **90.6%** | 81.2 | 100.0 | 12.8 | 25.0k | 18.0k | 7.1k | **33.6** | 36 | 29.3 | 86.1 |
| 24 | 27.09 08:01 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **88.6%** | 82.1 | 95.0 | 6.7 | 25.4k | 19.7k | 5.7k | **66.3** | 86 | 15.5 | 14.9 |
| 25 | 27.09 08:34 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | low | **88.6%** | 82.1 | 95.0 | 6.8 | 27.0k | 19.7k | 7.4k | **70.3** | 75 | 15.3 | 22.6 |
| 26 | 26.09 19:52 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | medium | **88.3%** | 85.7 | 90.9 | 9.2 | 38.3k | 30.4k | 7.9k | **73.9** | 79 | 15.1 | 26.9 |
| 27 | 25.09 16:29 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | low | **87.5%** | 75.0 | 100.0 | 68.2 | 87.6k | 80.3k | 7.3k | **21.5** | 23 | 24.6 | 63.6 |
| 28 | 25.09 09:47 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | max | **87.5%** | 75.0 | 100.0 | 205.8 | ~65.8k | ~62.2k | ~3.6k | **5.3** | 9 | 27.0 | 120.5 |
| 29 | 26.09 19:42 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | llama.cpp | RTX 4080 16 GB | low | **86.3%** | 89.3 | 83.3 | 10.6 | 45.0k | 37.4k | 7.6k | **75.3** | 81 | 15.1 | 27.0 |
| 30 | 27.09 07:40 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **85.1%** | 77.6 | 92.6 | 8.9 | 27.0k | 20.9k | 6.1k | **52.9** | 83 | 15.0 | 14.9 |
| 31 | 27.09 08:50 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | llama.cpp | RTX 4080 16 GB | low | **83.8%** | 84.3 | 83.3 | 12.1 | 47.2k | 39.9k | 7.3k | **68.3** | 77 | 15.6 | 23.4 |
| 32 | 26.09 23:27 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **83.6%** | 72.2 | 95.0 | 13.8 | ~35.4k | ~29.2k | ~6.2k | **44.0** | 87 | 15.5 | 17.1 |
| 33 | 25.09 09:12 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **82.9%** | 65.7 | 100.0 | 13.7 | 9.6k | 1.0k | 8.6k | **11.9** | 14 | 27.0 | 119.7 |
| 34 | 26.09 23:07 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **81.1%** | 75.8 | 86.4 | 9.6 | 33.1k | 26.8k | 6.3k | **61.2** | 81 | 14.1 | 16.3 |
| 35 | 25.09 13:50 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | default (xhigh) | **79.2%** | 75.0 | 83.3 | 84.7 | ~53.6k | ~51.4k | ~2.2k | **10.6** | 18 | 29.4 | 83.3 |
| 36 | 27.09 07:09 | Qwen3.8-27B | EXL3 2.2 bpw | ExLlamaV3 | RTX 4080 16 GB | low | **78.5%** | 75.0 | 81.9 | 10.3 | 29.5k | 24.2k | 5.3k | **58.3** | 80 | 14.1 | 14.3 |

Score per task (%):

| Run | Model / effort | t1_cube | t2_solar | t3_instanced_wave | t4_shader_water | t5_raycast_click | t6_terrain | p1_parse_duration | p2_sliding_median | p3_topo_order | p4_gather_limited |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 25.09 16:11 | Qwen3.8-27B UD-Q6_K_M / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:41 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 07:52 | Qwen3.8-27B EXL3 3.0 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 26.09 21:05 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:15 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 25.09 17:37 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 25.09 09:26 | GLM-5.3-Flash EXL3 3.05 bpw / high | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 100 | 100 | 100 |
| 25.09 23:45 | Qwen3.8-Flash-Next UD-Q4_K_XL / medium | 100 | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 27.09 08:08 | Qwen3.8-27B EXL3 3.0 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 93 | 100 | 100 | 100 |
| 25.09 16:15 | Qwen3.8-27B UD-Q6_K_M / medium | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 100 |
| 26.09 20:45 | Qwen3.8-27B AP IQ3_XS / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| 27.09 09:03 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 86 | 100 | 100 |
| 26.09 20:33 | Qwen3.8-27B AP IQ3_XS / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 80 |
| 26.09 23:20 | Qwen3.8-27B EXL3 3.0 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 71 | 100 | 100 |
| 26.09 20:22 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S MTP / medium | 100 | 100 | 100 | 100 | 100 | 92 | 100 | 71 | 100 | 100 |
| 25.09 22:47 | GLM-5.3-Flash GSQ-RCO 3.5-bit / high | 45 | 82 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 26.09 23:01 | Qwen3.8-27B EXL3 2.2 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 60 |
| 26.09 20:55 | Qwen3.8-27B AP IQ3_S / low | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 57 | 100 | 100 |
| 26.09 20:12 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S MTP / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 25.09 15:26 | Qwen3.8-27B UD-Q6_K_M / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 27.09 07:19 | Qwen3.8-27B EXL3 2.2 bpw / medium | 100 | 100 | 100 | 70 | 100 | 58 | 89 | 100 | 100 | 100 |
| 27.09 07:27 | Qwen3.8-27B EXL3 2.2 bpw / low | 100 | 100 | 100 | 100 | 100 | 58 | 100 | 57 | 100 | 100 |
| 25.09 20:59 | Qwen3.8-Flash-Next EXL3 5.05 bpw / medium | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 29 | 100 | 100 |
| 27.09 08:01 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 70 | 100 | 100 | 100 | 29 | 100 | 100 |
| 27.09 08:34 | Qwen3.8-27B AP IQ3_S / low | 100 | 100 | 100 | 70 | 100 | 100 | 100 | 29 | 100 | 100 |
| 26.09 19:52 | Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS / medium | 100 | 100 | 45 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| 25.09 16:29 | Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 |
| 25.09 09:47 | GLM-5.3-Flash EXL3 3.05 bpw / max | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (time) |
| 26.09 19:42 | Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS / low | 100 | 100 | 100 | 100 | 100 | 0 | 100 | 57 | 100 | 100 |
| 27.09 07:40 | Qwen3.8-27B EXL3 2.2 bpw / medium | 64 | 100 | 100 | 100 | 100 | 92 | 96 | 14 | 100 | 100 |
| 27.09 08:50 | Qwen3.8-27B abliterated GSQ-RCO IQ3_S / low | 100 | 100 | 100 | 0 | 100 | 100 | 100 | 57 | 100 | 80 |
| 26.09 23:27 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 70 | 100 | 100 | 89 | 0 (none) | 100 | 100 |
| 25.09 09:12 | GLM-5.3-Flash EXL3 3.05 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 63 | 100 | 100 | 0 |
| 26.09 23:07 | Qwen3.8-27B EXL3 2.2 bpw / medium | 100 | 100 | 100 | 60 | 100 | 58 | 89 | 14 | 100 | 100 |
| 25.09 13:50 | Qwen3.8-Flash-Next EXL3 5.05 bpw / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 0 | 0 | 100 | 100 | 100 |
| 27.09 07:09 | Qwen3.8-27B EXL3 2.2 bpw / low | 100 | 0 | 100 | 100 | 100 | 92 | 100 | 0 | 100 | 100 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated (the server did not report it for some tasks, e.g. interrupted or looping ones).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
