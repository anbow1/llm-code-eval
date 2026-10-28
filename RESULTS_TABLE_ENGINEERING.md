# Results table: engineering suite (--suite engineering)

2 Three.js tasks that test physics and mechanics (120 min each): a Unitas 6497-1 watch movement that works as a mechanism (balance at 2.5 Hz, pallet fork in step with it, half a tooth per beat, meshing toothed wheels with the right ratios, an exploded view), and a realistic rocket launch from Cape Canaveral (thrust-to-weight, burn, gravity turn, plume and steam at the pad, the Karman line with a dark sky and stars). How real it looks is rated by eye from each run's pictures and scene.html.

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 120-minute and 196,608-token limit per task. Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | 1 | **96.9%** | – | 0.0% | 0% | 121.4 | 164.9k | 22.8 | 30.9 |
| 2 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | 1 | **94.6%** | – | 0.0% | 0% | 111.9 | 153.9k | 23.0 | 30.9 |
| 3 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | 1 | **80.7%** | – | 80.7% | 0% | 4.2 | 30.1k | 139.3 | 31.1 |
| 4 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | 1 | **61.9%** | – | 61.9% | 0% | 5.0 | 38.2k | 141.5 | 31.1 |
| 5 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | 1 | **50.0%** | – | 0.0% | 0% | 24.3 | 178.7k | 126.2 | 30.8 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28.10 03:57 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | max | **96.9%** | n/a | 96.9 | 121.4 | 164.9k | 131.2k | 33.7k | **22.8** | 23 | 30.9 | 160.7 |
| 2 | 28.10 02:05 | DeepSeek-V4.1-Flash | Maya-S | Maya | RTX 5090 32 GB + 192 GB RAM | high | **94.6%** | n/a | 94.6 | 111.9 | 153.9k | 124.3k | 29.6k | **23.0** | 23 | 30.9 | 160.0 |
| 3 | 27.10 21:31 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | medium | **80.7%** | n/a | 80.7 | 4.2 | 30.1k | 6.9k | 23.2k | **139.8** | 144 | 31.1 | 137.8 |
| 4 | 27.10 21:26 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | low | **61.9%** | n/a | 61.9 | 5.0 | 38.2k | 13.8k | 24.4k | **141.4** | 148 | 31.1 | 135.9 |
| 5 | 27.10 21:36 | Qwen3.8-Flash-Next | NVFP4 GPTQ | Strata | RTX 5090 32 GB + 192 GB RAM | xhigh | **50.0%** | n/a | 50.0 | 24.3 | 178.7k | 145.6k | 33.1k | **126.0** | 127 | 30.8 | 139.0 |

## Score per task (%)

| Run | Model / effort | e1_watch_unitas | e2_rocket_launch |
|---|---|---|---|
| 28.10 03:57 | DeepSeek-V4.1-Flash Maya-S (Maya) / max | 100 | 94 |
| 28.10 02:05 | DeepSeek-V4.1-Flash Maya-S (Maya) / high | 95 | 94 |
| 27.10 21:31 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / medium | 86 | 75 |
| 27.10 21:26 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / low | 86 | 38 |
| 27.10 21:36 | Qwen3.8-Flash-Next NVFP4 GPTQ (Strata) / xhigh | 100 | 0 |

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
