# Results table: scene suite (--suite scene)

1 large graphics task: a boat rocking on an ocean next to a tropical island (Three.js, 30 min). The checks test what can be measured (the boat floats on the waves the shader draws, swaying leaves, shadows, fog, sky); how good it looks is compared on scene_gallery.jpg and in each run's scene.html.

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 30-minute and 98,304-token limit for the task. Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | 1 | **100.0%** | – | 100.0% | 0% | 1.2 | 8.4k | 155.8 | 30.8 |
| 2 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 1 | **100.0%** | – | 0.0% | 0% | 24.3 | 39.5k | 27.4 | 31.3 |
| 3 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **95.7%** | – | 0.0% | 0% | 27.8 | 40.0k | 24.2 | 31.0 |
| 4 | GLM-5.3-Flash | EXL3 4.10 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high, 180 min | 1 | **95.7%** | – | 0.0% | 0% | 40.5 | 40.7k | 16.9 | 30.7 |
| 5 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 2 | **93.5%** | 87–100 | 0.0% | 0% | 28.8 | 42.6k | 24.9 | 31.4 |
| 6 | GLM-5.3-Flash | EXL3 4.10 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **0.0%** | – | 0.0% | 100% | 30.0 | ~30.9k | 17.1 | 30.7 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped mid-thought).

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | 2 | **93.5%** | 9.2 | 87.0% | 0/1 | 0% | 0/1 | – |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 26.10 12:55 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | **100.0%** | n/a | 100.0 | 1.2 | 8.4k | 1.6k | 6.8k | **152.4** | 163 | 30.8 | 85.8 |
| 2 | 26.10 12:59 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | n/a | 100.0 | 24.3 | 39.5k | 32.8k | 6.7k | **27.4** | 28 | 31.3 | 166.4 |
| 3 | 26.10 12:08 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | n/a | 100.0 | 29.4 | 41.8k | 32.8k | 9.1k | **24.0** | 24 | 31.3 | 163.2 |
| 4 | 26.10 13:58 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB + 192 GB RAM | high | **95.7%** | n/a | 95.7 | 27.8 | 40.0k | 32.8k | 7.2k | **24.3** | 24 | 31.0 | 129.0 |
| 5 | 26.10 14:34 | GLM-5.3-Flash | EXL3 4.10 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high, 180 min | **95.7%** | n/a | 95.7 | 40.5 | 40.7k | 32.8k | 7.9k | **16.9** | 17 | 30.7 | 155.7 |
| 6 | 26.10 11:37 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **87.0%** | n/a | 87.0 | 28.2 | 43.4k | 32.8k | 10.6k | **25.9** | 26 | 31.4 | 161.6 |
| 7 | 26.10 13:26 | GLM-5.3-Flash | EXL3 4.10 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | **0.0%** | n/a | 0.0 | 30.0 | ~30.9k | ~30.9k | ~0.0k | **17.1** | 17 | 30.7 | 155.4 |

## Score per task (%)

| Run | Model / effort | s1_ocean_island |
|---|---|---|
| 26.10 12:55 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 100 |
| 26.10 12:59 | DeepSeek-V4.1-Flash GSQ-RCO IQ2_XS (Strata) / high | 100 |
| 26.10 12:08 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 100 |
| 26.10 13:58 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / high | 96 |
| 26.10 14:34 | GLM-5.3-Flash EXL3 4.10 bpw (Maya) / high, 180 min | 96 |
| 26.10 11:37 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 87 |
| 26.10 13:26 | GLM-5.3-Flash EXL3 4.10 bpw (Maya) / high | 0 (time) |

## By eye

How the picture looks, 1-10 per part (from [ratings_scene.json](ratings_scene.json): rated from the gallery screenshots, software renderer, same camera). The automatic score checks what can be measured; this is the rest.

| Run | Model | Quant | Backend | Effort | Score | By eye | Water | Island | Light | Boat | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 26.10 12:59 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | high | 100% | **7.5** | 7 | 7 | 7 | 7 | turquoise water with a sun glint and a foam ring, green island with a beach, visible sun, a clear sailboat |
| 26.10 12:08 | DeepSeek-V4.1-Flash | Maya-S | Maya | high | 100% | **7** | 6 | 8 | 6 | 6 | the most complete island (sand, grass, rocky peak, palms, shore foam); water ripples repeat in a visible grid |
| 26.10 14:34 | GLM-5.3-Flash | EXL3 4.10 bpw | Maya | high, 180 min | 96% | **6** | 8 | 4 | 6 | 5 | turquoise water with a sun-glitter path and foam, a good sky; the island and palms are very dark |
| 26.10 13:58 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | high | 96% | **5** | 8 | 3 | 4 | 5 | the best-looking deep-blue waves, but the island is a black silhouette (backlit, no fill light) |
| 26.10 12:55 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | medium | 100% | **4** | 4 | 3 | 5 | 3 | a flat sand cone with tiny palms; dark blocky water; the boat is a thin sail on an almost invisible hull |
| 26.10 11:37 | DeepSeek-V4.1-Flash | Maya-S | Maya | high | 87% | **3** | 0 | 7 | 6 | 6 | no ocean on screen: the water shader does not compile; the island itself is good (sand ring, rocks, palms) |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
