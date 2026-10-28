# Results table: engineering suite (--suite engineering)

2 Three.js tasks that test physics and mechanics (60 min each): a Unitas 6497-1 watch movement in an exploded view (balance at 2.5 Hz, escapement and gear ratios), and a rocket launch from Cape Canaveral (thrust-to-weight, burn, gravity turn, the Karman line with a dark sky and stars).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | 1 | **91.5%** | – | 0.0% | 0% | 121.4 | 164.9k | 22.8 | 30.9 |
| 2 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **89.2%** | – | 0.0% | 0% | 111.9 | 153.9k | 23.0 | 30.9 |
| 3 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | 1 | **82.4%** | – | 82.4% | 0% | 4.2 | 30.1k | 139.3 | 31.1 |
| 4 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | 1 | **63.6%** | – | 63.6% | 0% | 5.0 | 38.2k | 141.5 | 31.1 |
| 5 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | 1 | **45.5%** | – | 0.0% | 0% | 24.3 | 178.7k | 126.2 | 30.8 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28.10 03:57 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | **91.5%** | n/a | 91.5 | 121.4 | 164.9k | 131.2k | 33.7k | **22.8** | 23 | 30.9 | 160.7 |
| 2 | 28.10 02:05 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **89.2%** | n/a | 89.2 | 111.9 | 153.9k | 124.3k | 29.6k | **23.0** | 23 | 30.9 | 160.0 |
| 3 | 27.10 21:31 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | **82.4%** | n/a | 82.4 | 4.2 | 30.1k | 6.9k | 23.2k | **139.8** | 144 | 31.1 | 137.8 |
| 4 | 27.10 21:26 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | **63.6%** | n/a | 63.6 | 5.0 | 38.2k | 13.8k | 24.4k | **141.4** | 148 | 31.1 | 135.9 |
| 5 | 27.10 21:36 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | **45.5%** | n/a | 45.5 | 24.3 | 178.7k | 145.6k | 33.1k | **126.0** | 127 | 30.8 | 139.0 |

## Score per task (%)

| Run | Model / effort | e1_watch_unitas | e2_rocket_launch |
|---|---|---|---|
| 28.10 03:57 | DeepSeek-V4.1-Flash Maya-S (Maya) / max | 95 | 88 |
| 28.10 02:05 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 91 | 88 |
| 27.10 21:31 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 77 | 88 |
| 27.10 21:26 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / low | 77 | 50 |
| 27.10 21:36 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / xhigh | 91 | 0 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
