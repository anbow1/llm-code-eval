# Results table

## Base suite

10 tasks (6 × TypeScript + Three.js, 4 × Python), temperature 1.0, 65,536-token and 60-minute limit per task. One run per setting.

| # | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | low | **100.0%** | 100.0 | 100.0 | 4.7 | 28.7k | 21.9k | 6.8k | **108.9** | 121 | 29.8 | 39.8 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | medium | **100.0%** | 100.0 | 100.0 | 54.6 | 72.1k | 64.4k | 7.8k | **22.2** | 23 | 24.6 | 67.3 |
| 3 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | high | **99.5%** | 99.1 | 100.0 | 20.5 | 15.0k | 7.8k | 7.2k | **12.4** | 14 | 27.0 | 117.7 |
| 4 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | RTX 5090 32 GB | medium | **99.2%** | 100.0 | 98.5 | 29.5 | 55.4k | 47.7k | 7.8k | **31.7** | 39 | 26.8 | 101.3 |
| 5 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | medium | **98.6%** | 97.2 | 100.0 | 3.9 | 22.2k | 14.1k | 8.1k | **105.3** | 120 | 29.8 | 39.7 |
| 6 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | RTX 5090 32 GB | high | **93.9%** | 100.0 | 87.9 | 18.8 | 13.5k | 6.4k | 7.2k | **12.4** | 14 | 30.8 | 127.1 |
| 7 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | RTX 5090 32 GB | default (xhigh) | **92.9%** | 85.7 | 100.0 | 37.5 | 194.0k | 184.8k | 9.2k | **87.1** | 94 | 30.0 | 39.7 |
| 8 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | medium | **90.6%** | 81.2 | 100.0 | 12.8 | 25.0k | 18.0k | 7.1k | **33.6** | 36 | 29.3 | 86.1 |
| 9 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | RTX 5090 32 GB | low | **87.5%** | 75.0 | 100.0 | 68.2 | 87.6k | 80.3k | 7.3k | **21.5** | 23 | 24.6 | 63.6 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | max | **87.5%** | 75.0 | 100.0 | 205.8 | ~65.8k | ~62.2k | ~3.6k | **5.3** | 9 | 27.0 | 120.5 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | RTX 5090 32 GB | low | **82.9%** | 65.7 | 100.0 | 13.7 | 9.6k | 1.0k | 8.6k | **11.9** | 14 | 27.0 | 119.7 |
| 12 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | RTX 5090 32 GB | default (xhigh) | **79.2%** | 75.0 | 83.3 | 84.7 | ~53.6k | ~51.4k | ~2.2k | **10.6** | 18 | 29.4 | 83.3 |

Score per task (%):

| Model / effort | t1_cube | t2_solar | t3_instanced_wave | t4_shader_water | t5_raycast_click | t6_terrain | p1_parse_duration | p2_sliding_median | p3_topo_order | p4_gather_limited |
|---|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-27B UD-Q6_K_M / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| GLM-5.3-Flash EXL3 3.05 bpw / high | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 100 | 100 | 100 |
| Qwen3.8-Flash-Next UD-Q4_K_XL / medium | 100 | 91 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-27B UD-Q6_K_M / medium | 100 | 100 | 100 | 100 | 100 | 100 | 89 | 100 | 100 | 100 |
| GLM-5.3-Flash GSQ-RCO 3.5-bit / high | 45 | 82 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| Qwen3.8-27B UD-Q6_K_M / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 43 | 100 | 100 |
| Qwen3.8-Flash-Next EXL3 5.05 bpw / medium | 100 | 100 | 100 | 100 | 100 | 100 | 96 | 29 | 100 | 100 |
| Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS / low | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (limit) | 100 | 100 |
| GLM-5.3-Flash EXL3 3.05 bpw / max | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 0 (time) |
| GLM-5.3-Flash EXL3 3.05 bpw / low | 100 | 100 | 100 | 100 | 100 | 100 | 63 | 100 | 100 | 0 |
| Qwen3.8-Flash-Next EXL3 5.05 bpw / default (xhigh) | 100 | 100 | 100 | 100 | 100 | 0 | 0 | 100 | 100 | 100 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated (the server did not report it for some tasks, e.g. interrupted or looping ones).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
