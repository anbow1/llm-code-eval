# Results table: engineering suite (--suite engineering)

2 Three.js tasks that test physics and mechanics (120 min each): a Unitas 6497-1 watch movement that works as a mechanism (balance at 2.5 Hz, pallet fork in step with it, half a tooth per beat, meshing toothed wheels with the right ratios, an exploded view), and a realistic rocket launch from Cape Canaveral (thrust-to-weight, burn, gravity turn, plume and steam at the pad, the Karman line with a dark sky and stars). How real it looks is rated by eye from each run's pictures and scene.html.

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 120-minute and 196,608-token limit per task. Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 2 | **97.3%** | 95–100 | 0.0% | 0% | 117.8 | 159.3k | 22.6 | 31.1 |
| 2 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | 1 | **96.9%** | – | 0.0% | 0% | 121.4 | 164.9k | 22.8 | 30.9 |
| 3 | DeepSeek-V4.1-Flash | EXL2 2.9 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | max | 1 | **95.1%** | – | 0.0% | 0% | 129.9 | 168.0k | 21.7 | 30.8 |
| 4 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 1 | **84.2%** | – | 0.0% | 0% | 73.4 | 119.3k | 27.4 | 31.3 |
| 5 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | 1 | **80.7%** | – | 80.7% | 0% | 4.2 | 30.1k | 139.3 | 31.1 |
| 6 | DeepSeek-V4.1-Flash | EXL2 2.9 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **66.9%** | – | 0.0% | 0% | 120.3 | 147.9k | 20.7 | 31.2 |
| 7 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | 1 | **61.9%** | – | 61.9% | 0% | 5.0 | 38.2k | 141.5 | 31.1 |
| 8 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | 1 | **50.0%** | – | 0.0% | 0% | 24.3 | 178.7k | 126.2 | 30.8 |
| 9 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XXS | Strata | RTX 5090 32 GB + 192 GB RAM | high | 1 | **10.0%** | – | 0.0% | 50% | 32.8 | 54.9k | 28.3 | 31.4 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend. **Problem tasks** = tasks scored below 90% in at least half of the runs (and at least twice): failed/runs, then how (wrong = wrong answer; time, limit, none = out of time or tokens, or stopped mid-thought).

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers | Problem tasks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | 2 | **97.3%** | 3.8 | 94.6% | 0/2 | 0% | 0/2 | – |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28.10 19:55 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **100.0%** | n/a | 100.0 | 123.8 | 164.7k | 131.1k | 33.7k | **22.3** | 22 | 31.1 | 165.9 |
| 2 | 28.10 03:57 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | **96.9%** | n/a | 96.9 | 121.4 | 164.9k | 131.2k | 33.7k | **22.8** | 23 | 30.9 | 160.7 |
| 3 | 29.10 01:14 | DeepSeek-V4.1-Flash | EXL2 2.9 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | max | **95.1%** | n/a | 95.1 | 129.9 | 168.0k | 131.1k | 36.9k | **21.7** | 22 | 30.8 | 191.0 |
| 4 | 28.10 02:05 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **94.6%** | n/a | 94.6 | 111.9 | 153.9k | 124.3k | 29.6k | **23.0** | 23 | 30.9 | 160.0 |
| 5 | 28.10 18:32 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XS | Strata | RTX 5090 32 GB + 192 GB RAM | high | **84.2%** | n/a | 84.2 | 73.4 | 119.3k | 65.7k | 53.7k | **27.4** | 28 | 31.3 | 165.6 |
| 6 | 27.10 21:31 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | **80.7%** | n/a | 80.7 | 4.2 | 30.1k | 6.9k | 23.2k | **139.8** | 144 | 31.1 | 137.8 |
| 7 | 28.10 23:13 | DeepSeek-V4.1-Flash | EXL2 2.9 bpw | Maya | RTX 5090 32 GB + 192 GB RAM | high | **66.9%** | n/a | 66.9 | 120.3 | 147.9k | 118.7k | 29.3k | **20.7** | 21 | 31.2 | 191.0 |
| 8 | 27.10 21:26 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | **61.9%** | n/a | 61.9 | 5.0 | 38.2k | 13.8k | 24.4k | **141.4** | 148 | 31.1 | 135.9 |
| 9 | 27.10 21:36 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | **50.0%** | n/a | 50.0 | 24.3 | 178.7k | 145.6k | 33.1k | **126.0** | 127 | 30.8 | 139.0 |
| 10 | 28.10 22:09 | DeepSeek-V4.1-Flash | GSQ-RCO IQ2_XXS | Strata | RTX 5090 32 GB + 192 GB RAM | high | **10.0%** | n/a | 10.0 | 32.8 | 54.9k | 40.2k | 14.8k | **28.3** | 28 | 31.4 | 128.4 |

## Score per task (%)

| Run | Model / effort | e1_watch_unitas | e2_rocket_launch |
|---|---|---|---|
| 28.10 19:55 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 100 | 100 |
| 28.10 03:57 | DeepSeek-V4.1-Flash Maya-S (Maya) / max | 100 | 94 |
| 29.10 01:14 | DeepSeek-V4.1-Flash EXL2 2.9 bpw (Maya) / max | 95 | 95 |
| 28.10 02:05 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 95 | 94 |
| 28.10 18:32 | DeepSeek-V4.1-Flash GSQ-RCO IQ2_XS (Strata) / high | 100 | 68 |
| 27.10 21:31 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 86 | 75 |
| 28.10 23:13 | DeepSeek-V4.1-Flash EXL2 2.9 bpw (Maya) / high | 86 | 47 |
| 27.10 21:26 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / low | 86 | 38 |
| 27.10 21:36 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / xhigh | 100 | 0 |
| 28.10 22:09 | DeepSeek-V4.1-Flash GSQ-RCO IQ2_XXS (Strata) / high | 20 | 0 (none) |

## By eye

How real it looks, 1-10 per task (from [ratings_engineering.json](ratings_engineering.json): rated from the saved pictures, software renderer; 0 = no picture). The automatic checks test the physics and the mechanism; this is the rest. Pictures: engineering_gallery.jpg.

| Run | Model | Quant | Backend | Effort | Watch score | Watch by eye | Rocket score | Rocket by eye | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 28.10 02:05 | DeepSeek-V4.1-Flash | Maya-S | Maya | high | 95% | **6** | 94% | **6.5** | watch: perlage plate (too coarse, looks knurled), Geneva-striped bridges, wheels visible between them, blued hands and hairspring; rocket: lattice tower, white rocket with a flag, a bright plume with a warm glow, haze; little steam; in space the sun, stars and the trail |
| 28.10 03:57 | DeepSeek-V4.1-Flash | Maya-S | Maya | max | 100% | **5** | 94% | **6** | watch: gilded plate with perlage and a domed glass rim, but a strong depth-of-field blur hides the mechanism; rocket: tower, lightning masts with wires, low buildings, a white-hot plume; above 100 km the sky is still dark blue |
| 27.10 21:26 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | low | 86% | **4.5** | 38% | **1** | watch: gold plate with toothed wheels, a balance with a spiral hairspring and red jewels; flat lighting, no finishes, crude; rocket: white frame: UnrealBloomPass (threshold 0.6, strength 1.2-1.7) on the HDR Sky addon blows the whole picture out; without the bloom the same code shows a red lattice tower, the rocket, the pad and a blue sky |
| 27.10 21:36 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | xhigh | 100% | **4** | 0% | **0** | watch: a guilloche plate, but one large Geneva-striped bridge block covers almost the whole train; labels everywhere; rocket: does not compile (TS2339) and stops at startup with 'Cannot read properties of undefined (reading position)': a white page |
| 27.10 21:31 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | medium | 86% | **2** | 75% | **1.5** | watch: the camera sits inside the movement: glare, a few parts out of focus, the mechanism cannot be seen; rocket: white frame for the same reason (bloom strength 1.5-2.0 on the bright Sky); above 100 km a black sky with a few stars, no rocket |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
