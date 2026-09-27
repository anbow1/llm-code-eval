# Results table: hard suite (--suite hard)

6 tasks (3 × TypeScript + Three.js, 3 × Python). Base-suite results are in [RESULTS_TABLE.md](RESULTS_TABLE.md).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 65,536-token and 60-minute limit per task. Settings that were run more than once are averaged in the first table; every single run is listed in the second.

## Mean per setting

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | 2 | **93.1%** | 92–94 | 11.0 | ~54.0k | 82.9 | 15.6 |
| 2 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | 3 | **87.8%** | 83–94 | 17.8 | 67.4k | 63.9 | 15.4 |
| 3 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | 1 | **66.7%** | – | 10.9 | ~53.9k | 83.2 | 15.5 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 27.09 10:05 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 11.4 | ~52.4k | ~45.4k | ~7.0k | **77.9** | 81 | 15.6 | 14.2 |
| 2 | 27.09 10:54 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **94.1%** | 88.1 | 100.0 | 13.7 | 59.5k | 52.2k | 7.3k | **73.1** | 78 | 15.3 | 26.3 |
| 3 | 27.09 10:30 | Qwen3.8-27B | EXL3 3.0 bpw | ExLlamaV3 | RTX 4080 16 GB | medium | **92.1%** | 84.2 | 100.0 | 10.6 | ~55.5k | ~47.0k | ~8.5k | **88.5** | 91 | 15.6 | 15.4 |
| 4 | 27.09 10:42 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **86.1%** | 72.2 | 100.0 | 10.2 | 44.9k | 38.0k | 6.8k | **74.7** | 78 | 15.2 | 22.2 |
| 5 | 27.09 09:14 | Qwen3.8-27B | AP IQ3_S | llama.cpp | RTX 4080 16 GB | medium | **83.3%** | 66.7 | 100.0 | 29.4 | 97.9k | 91.1k | 6.9k | **55.8** | 73 | 15.4 | 21.2 |
| 6 | 27.09 10:18 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | ExLlamaV3 | RTX 4080 16 GB | medium | **66.7%** | 33.3 | 100.0 | 10.9 | ~53.9k | ~49.6k | ~4.3k | **83.4** | 88 | 15.5 | 14.7 |

## Score per task (%)

| Run | Model / effort | h_t1_physics | h_t2_instanced_pick | h_t3_postfx_invert | h_p1_interval_set | h_p2_expr_eval | h_p3_line_diff |
|---|---|---|---|---|---|---|---|
| 27.09 10:05 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:54 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 98 | 67 |
| 27.09 10:30 | Qwen3.8-27B EXL3 3.0 bpw / medium | 100 | 100 | 100 | 57 | 95 | 100 |
| 27.09 10:42 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 17 |
| 27.09 09:14 | Qwen3.8-27B AP IQ3_S / medium | 100 | 100 | 100 | 100 | 100 | 0 (limit) |
| 27.09 10:18 | Qwen3.8-27B EXL3 3.0 bpw qv44 / medium | 100 | 100 | 100 | 100 | 0 (none) | 0 (none) |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
