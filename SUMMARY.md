# Local model coding test: summary (25–30 Sep 2026)

## TL;DR

- **Base suite (10 tasks) is saturated.** On the RTX 5090 seven settings score 100%. The fastest are:
  - Qwen3.8-27B UD-Q6_K_M at `low` (llama.cpp): 4.7 min;
  - Qwen3.8-Flash-Next GSQ-RCO IQ3_S in the Strata engine at `medium`: 4.9 min;
  - Qwen3.8-27B EXL3 6.0 bpw at `low`: 5.0 min.
- **Hard suite (6 tasks) now has results from both PCs, and it separates the models.**
  - **Best: Qwen3.8-Flash-Next GSQ-RCO IQ3_S in Strata**, 100% at `medium` (20 min) and 97.8% at `low` (8.4 min), one run each.
  - **Best quality per minute: Qwen3.8-27B EXL3 6.0 bpw at `low` on the 5090**: 94.4% in 6.5 min.
  - **Qwen3.8-Flash-Next UD-Q4_K_XL**: 95.8% over 2 runs, 20 min.
  - **GLM-5.3-Flash is the weakest and slowest.** At `high` it scored 82% and hit the 60-minute limit on `h_p3_line_diff` in 3 of 3 runs, so a run takes 90–115 min. At `low` it scored 78%.
- **The Strata engine makes Flash-Next about 3.7× faster than llama.cpp**, with the same file and the same memory use: 125–141 tok/s from time against 35. [Strata](https://github.com/Niko1221/Strata) v0.1.30 is an inference server built for MoE models on consumer GPUs; it manages which experts are cached on the GPU.
- **Qwen3.8-27B works on a 16 GB card.** On the RTX 4080 the best 3-bit files almost match Q6 on the 5090 on the base suite, at about half the speed: AP IQ3_S at `medium` (100% twice, 8.2 min) and EXL3 3.0 bpw at `low` (98.5% over 3 runs, 7.3 min). On the hard suite EXL3 3.0 bpw scored 93.1%. Below 3 bits quality drops.
- **The reasoning level matters more than the choice of model.** Qwen does best at `low`/`medium`; `xhigh` overthinks code. GLM needs `high` on the base suite, but on the hard suite even `high` runs out of time.
- **ExLlamaV3 (TabbyAPI) under-reports tokens** on long answers. The counts were re-estimated from the saved text (marked `~`), and `run_eval.py` now corrects them by itself. ExLlamaV3 runs have also stopped mid-thought 3 times on the hard suite; see Part 3.
- **At temperature 1.0, one run is not enough.** The same setting ranged over up to 16 points between runs.

## Hardware and settings

- **PC A:** RTX 5090 32 GB VRAM + 128 GB DDR5 RAM, Windows. All runs from 25 Sep and 28–30 Sep.
- **PC B:** RTX 4080 16 GB VRAM + 32 GB DDR5 RAM, Windows. All Qwen3.8-27B 2–3-bit runs from 26–27 Sep.
- Backends: llama.cpp (`llama-server --jinja`), ExLlamaV3 (TabbyAPI) and, for two Flash-Next runs per suite on 30 Sep, [Strata](https://github.com/Niko1221/Strata) v0.1.30, an inference server for MoE models.
- Base suite, 10 tasks: 6 × TypeScript + Three.js, checked in a real browser (`tsc --strict` compile, rendering, animation, clicking, window resize), and 4 × Python with hidden correctness and performance tests. Hard suite: 6 tasks (`--suite hard`, see the README).
- Every run: temperature 1.0, sampling as recommended by the model makers (`--preset glm` / `qwen-think`), 60-minute limit per task. Token limit per task: 65,536; the runs from 30 Sep used 98,304 (the new default in `run_eval.py`).
- Many settings were run once; some 2–3 times. The tables show the mean.

The full tables, including every single run and the score per task, are in [RESULTS_TABLE.md](RESULTS_TABLE.md) (base suite) and [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md) (hard suite). Raw data (model code, thinking, screenshots) is in `results/` and `results_hard/`.

# Part 1: RTX 5090, base suite (25 and 29–30 Sep)

## Results from 25 Sep

| # | Model | Quant | Backend | Effort | Score | Time (min) | Total tokens | of which thinking | Avg tok/s (from time) | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | low | **100.0%** | **4.7** | 28.7k | 21.9k | 108.9 | 39.8 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | medium | **100.0%** | 54.6 | 72.1k | 64.4k | 22.2 | 67.3 |
| 3 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | **99.5%** | 20.5 | 15.0k | 7.8k | 12.4 | 117.7 |
| 4 | Qwen3.8-Flash-Next | UD-Q4_K_XL | llama.cpp | medium | **99.2%** | 29.5 | 55.4k | 47.7k | 31.7 | 101.3 |
| 5 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | medium | **98.6%** | **3.9** | 22.2k | 14.1k | 105.3 | 39.7 |
| 6 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | llama.cpp | high | 93.9% | 18.8 | 13.5k | 6.4k | 12.4 | 127.1 |
| 7 | Qwen3.8-27B | UD-Q6_K_M | llama.cpp | xhigh | 92.9% | 37.5 | 194.0k | 184.8k | 87.1 | 39.7 |
| 8 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | medium | 90.6% | 12.8 | 25.0k | 18.0k | 33.6 | 86.1 |
| 9 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | low | 87.5% | 68.2 | 87.6k | 80.3k | 21.5 | 63.6 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | 87.5% | 205.8 | ~159.1k | ~149.5k | 12.9 | 120.5 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | 82.9% | 13.7 | 9.6k | 1.0k | 11.9 | 119.7 |
| 12 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | xhigh | 79.2% | 84.7 | ~176.0k | ~170.8k | 34.8 | 83.3 |

- **Total tokens** = everything the model generated across the 10 tasks (thinking + answer).
- **Avg tok/s (from time)** = total tokens ÷ total generation time, including prompt processing and waiting for the first token. This is the real working speed, not just the writing speed.
- `~` = token count partly estimated, because the server did not report it for some tasks.
- The answer itself (code and explanation) is almost always about 7–9k tokens. The exceptions are the two runs with generation failures, where some tasks got no answer. Everything else in the token difference is thinking.

VRAM across all runs: 24.6–30.8 GB.

## Quality

Five settings scored 98.6% or more:

- Qwen3.8-27B `low`: 100%
- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `medium`: 100%
- GLM-5.3-Flash EXL3 `high`: 99.5%
- Qwen3.8-Flash-Next UD-Q4_K_XL `medium`: 99.2%
- Qwen3.8-27B `medium`: 98.6%

The differences between them come down to single test cases. With one run each at temperature 1.0 they are within noise. In this group **quality is effectively equal**.

Almost every setting did well on Three.js: 9 of 12 scored 100% there. The Python tasks made the difference, especially:

- **p2_sliding_median** (median over a sliding window): an off-by-one bug (Qwen 27B `xhigh`, after 39,000 thinking tokens), an `IndexError` (Qwen EXL3 `medium`), and running out of the 65,536-token limit (Qwen IQ3_XXS `low`).
- **p4_gather_limited** (asyncio with a concurrency limit): GLM `low` used something asyncio does not have (`asyncio.exceptions.FIRST_EXCEPTION`); GLM `max` thought for over 22,000 tokens and hit the 60-minute limit.
- **p1_parse_duration** (duration parser): the most common mistake was rejecting "1h30m" without a space, or accepting "1 h".

Failures that were not bad code but broken generation:

- Qwen Flash-Next EXL3 `xhigh`: in `p1` the model got stuck in a loop writing zeros for 7,800 tokens; in `t6` it stopped mid-thought and never wrote any code.
- GLM GSQ-RCO 3.5-bit (llama.cpp): TypeScript compile errors in `t1` and `t2` (a non-existent property, an undefined variable). The same model as EXL3 3.05 bpw did not make them.

## Quality vs time

| Setting | Score | Time | Total tokens | Avg tok/s (from time) | Notes |
|---|---|---|---|---|---|
| Qwen3.8-27B `medium` | 98.6% | 3.9 min | 22.2k | 105.3 | fastest |
| Qwen3.8-27B `low` | 100.0% | 4.7 min | 28.7k | 108.9 | best quality per minute |
| Qwen3.8-Flash-Next EXL3 `medium` | 90.6% | 12.8 min | 25.0k | 33.6 | |
| GLM-5.3-Flash EXL3 `low` | 82.9% | 13.7 min | 9.6k | 11.9 | too little thinking |
| GLM GSQ-RCO 3.5-bit `high` | 93.9% | 18.8 min | 13.5k | 12.4 | |
| GLM-5.3-Flash EXL3 `high` | 99.5% | 20.5 min | 15.0k | 12.4 | best large model |
| Qwen3.8-Flash-Next UD-Q4_K_XL `medium` | 99.2% | 29.5 min | 55.4k | 31.7 | |
| Qwen3.8-27B `xhigh` | 92.9% | 37.5 min | 194.0k | 87.1 | overthinks code |
| Qwen3.8-Flash-Next IQ3_XXS `medium` | 100.0% | 54.6 min | 72.1k | 22.2 | |
| Qwen3.8-Flash-Next IQ3_XXS `low` | 87.5% | 68.2 min | 87.6k | 21.5 | |
| Qwen3.8-Flash-Next EXL3 `xhigh` | 79.2% | 84.7 min | ~176.0k | 34.8 | generation failures |
| GLM-5.3-Flash EXL3 `max` | 87.5% | 205.8 min | ~159.1k | 12.9 | hit the time limit |

Test time = tokens ÷ speed. A model finishes fast either because it writes fast (Qwen 27B: about 105 tok/s) or because it thinks briefly (GLM `high`: 15k tokens at 12 tok/s).

- **Qwen3.8-27B wins clearly.** 100% in 4.7 minutes. Only the same model at `medium` is faster (3.9 min, 98.6%); every other setting is slower and no better. It runs at about 109 tok/s because it fits entirely in VRAM.
- **The large MoE models are slow on this hardware.** They manage 12–35 tok/s (from time) because most experts sit in system RAM. Qwen 27B fits entirely in VRAM and does 87–109 tok/s.
- The fastest large model is Qwen Flash-Next (EXL3 33.6 and UD-Q4_K_XL 31.7 tok/s from time). GLM manages only 12.4 tok/s but thinks briefly (15k tokens at `high`), so it finishes in 20 minutes. Qwen Flash-Next thinks 2–8 times longer than GLM `high`.
- An earlier version of this summary reported slowdowns in GLM `max` (down to 2.7 tok/s). They came from ExLlamaV3 under-reporting tokens (see Part 2); the real speed was a steady 12–15 tok/s. GLM `max` simply thinks a lot: about 150k thinking tokens.

## Reasoning levels

**Qwen (the chat template knows `low`, `medium`, `xhigh`; default `xhigh`).**

- `xhigh` adds an instruction to the prompt: "validate key assumptions, consider plausible alternatives". On code the model then starts going round in circles.
- Qwen 27B: `low` 21.9k thinking tokens, `medium` 14.1k, `xhigh` 184.8k. `xhigh` was 8× slower and scored lower.
- Qwen Flash-Next EXL3: `medium` 90.6% in 12.8 min, `xhigh` 79.2% in 84.7 min, with two generation failures.
- On a short maths question, though, `xhigh` thought the least and made no mistakes. The effect of the level depends on the kind of task.
- **For code: `low` or `medium`.**

**GLM-5.3 (the chat template knows only `low` and `high`; any other value means `max`).**

- `low` barely thinks (1,000 tokens for the whole test), so it makes real mistakes (82.9%).
- `high` is the best trade-off: 99.5% in 20.5 min.
- `max` thinks about 19× longer than `high` (~150k against 7.8k thinking tokens), takes 206 min and hit the time limit on one task.
- **For code: `high`.**

## New runs from 29–30 Sep

| Model | Quant | Backend | Effort | Score | Time (min) | Total tokens | Avg tok/s (from time) | Decode tok/s | VRAM / RAM GB |
|---|---|---|---|---|---|---|---|---|---|
| Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | low | **100.0%** | **5.0** | 30.5k | 108.1 | 134 | 26.9 / 17 |
| Qwen3.8-27B | EXL3 6.0 bpw | ExLlamaV3 | medium | **100.0%** | 6.5 | ~42.7k | 114.7 | 135 | 26.9 / 19 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | low | **100.0%** | 31.3 | 65.6k | 35.3 | 38 | 30.8 / 68 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | medium | **100.0%** | 35.3 | 73.3k | 35.0 | 38 | 30.8 / 73 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | low | 90.9% | 5.1 | 35.4k | 125.4 | 141 | 30.5 / 70 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | medium | **100.0%** | **4.9** | 34.8k | 129.0 | 145 | 30.5 / 68 |

- **Qwen3.8-27B EXL3 6.0 bpw is as good as Q6 in llama.cpp and a little faster**: 134 tok/s decode against 121, with 26.9 GB VRAM.
- **Flash-Next GSQ-RCO IQ3_S scored 100% at both levels**, but at 35 tok/s it needs over 30 minutes, like the other Flash-Next files.
- **The same file in [Strata](https://github.com/Niko1221/Strata) v0.1.30 ran 3.7× faster** (125–141 tok/s from time), with the same VRAM and RAM use. Strata is a separate inference server for MoE models that manages which experts are cached on the GPU. With it, the Flash-Next MoE is as fast as the dense 27B. Its `low` run lost points on `p1` (accepted "1 h"), `p2` (an `IndexError`, as in many runs), a TypeScript type error in `t3` and one check in `t6`.

# Part 2: Qwen3.8-27B at 2–3 bits on the RTX 4080 16 GB (26–27 Sep)

Seven files of Qwen3.8-27B that fit in 16 GB VRAM:

| File | Backend | Notes |
|---|---|---|
| AP IQ3_S | llama.cpp | |
| AP IQ3_XS | llama.cpp | a little smaller than IQ3_S |
| abliterated GSQ-RCO IQ3_S | llama.cpp | abliterated (uncensored) version of the model |
| abliterated GSQ-RCO IQ3_S MTP | llama.cpp | the same with multi-token prediction layers |
| abliterated GSQ-RCO IQ3_XXS | llama.cpp | |
| EXL3 3.0 bpw | ExLlamaV3 | also run as a `qv44` variant on the hard suite |
| EXL3 2.2 bpw | ExLlamaV3 | |

All of them used 14.1–15.6 GB of VRAM (out of 16), and system RAM stayed at 13–27 GB (out of 32).

## Base suite

Mean over runs. The Q6 rows from the 5090 are shown for comparison. `~` = token count re-estimated from the text (ExLlamaV3, see [Speed on the 4080](#speed-on-the-4080)).

| # | Model | Quant | GPU | Effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|
| – | Qwen3.8-27B | UD-Q6_K_M | 5090 | low | 1 | 100.0% | – | 4.7 | 28.7k | 108.6 |
| – | Qwen3.8-27B | UD-Q6_K_M | 5090 | medium | 1 | 98.6% | – | 3.9 | 22.2k | 105.9 |
| 1 | Qwen3.8-27B | AP IQ3_S | 4080 | medium | 2 | **100.0%** | 100–100 | 8.2 | 34.6k | 73.0 |
| 2 | Qwen3.8-27B | EXL3 3.0 bpw | 4080 | low | 3 | **98.5%** | 96–100 | 7.3 | ~34.7k | 83.8 |
| 3 | Qwen3.8-27B | AP IQ3_XS | 4080 | medium | 1 | 98.2% | – | 8.8 | 37.2k | 73.9 |
| 4 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | 4080 | medium | 1 | 98.2% | – | 9.5 | 37.7k | 68.3 |
| 5 | Qwen3.8-27B | AP IQ3_XS | 4080 | low | 1 | 97.5% | – | 12.3 | 46.8k | 65.1 |
| 6 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | 4080 | medium | 1 | 95.7% | – | 7.9 | 29.8k | 66.2 |
| 7 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S MTP | 4080 | low | 1 | 92.9% | – | 10.5 | 40.2k | 65.7 |
| 8 | Qwen3.8-27B | AP IQ3_S | 4080 | low | 2 | 90.9% | 89–93 | 8.2 | 34.0k | 71.7 |
| 9 | Qwen3.8-27B | EXL3 3.0 bpw | 4080 | medium | 3 | 90.7% | 84–100 | 12.9 | ~57.7k | 76.6 |
| 10 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | 4080 | medium | 1 | 88.3% | – | 9.2 | 38.3k | 74.3 |
| 11 | Qwen3.8-27B | EXL3 2.2 bpw | 4080 | low | 3 | 87.8% | 78–94 | 9.6 | ~39.6k | 76.2 |
| 12 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_XXS | 4080 | low | 1 | 86.3% | – | 10.6 | 45.0k | 75.0 |
| 13 | Qwen3.8-27B | EXL3 2.2 bpw | 4080 | medium | 3 | 86.3% | 81–93 | 8.3 | ~37.7k | 80.9 |
| 14 | Qwen3.8-27B abliterated | GSQ-RCO IQ3_S | 4080 | low | 1 | 83.8% | – | 12.1 | 47.2k | 68.4 |

- **Best on 16 GB:** AP IQ3_S at `medium` (100% twice, 8.2 min) and EXL3 3.0 bpw at `low` (98.5% over 3 runs, 7.3 min). That is the quality of Q6 on the 5090, at 1.5–2× the time.
- **3 bits are the floor.** EXL3 2.2 bpw loses about 10 points against 3.0 bpw, at either level.
- **Abliterated GSQ-RCO files are weaker.** They average 91% against 96% for the plain AP files. At `low` they also think about 20% longer. The MTP version was not faster: 73 tok/s decode against 77 for the version without MTP.
- **`low` vs `medium` depends on the file.** GGUF files did better at `medium` in 5 of 5 pairs. EXL3 3.0 bpw did better at `low` (98.5% against 90.7%) and thought about half as much there (28k against 51k thinking tokens).

What the 3-bit files got wrong on the base suite, and Q6 did not:

- **p2_sliding_median** is again the hardest task: `IndexError` with an even window, wrong results with duplicate values. 16 of 24 runs lost points here.
- **Three.js compile and shader errors**, which Q6 on the 5090 never had:
  - GLSL that does not compile (`t4_shader_water`, 5×);
  - properties that do not exist (`renderer.canvas`, `autoResize`, `setElements`);
  - a `t2_solar` file with a syntax error.
  
  This looks like quantisation damage: the model remembers the API less precisely.
- **p1_parse_duration**: rejecting "1h30m" without a space, as on the 5090.

## Speed on the 4080

- **llama.cpp (GGUF): steady 73–81 tok/s decode**, 65–75 tok/s from time. That is about 65% of Q6 on the 5090.
- **ExLlamaV3 (EXL3): steady 81–97 tok/s decode**, 76–84 tok/s from time, so about 15% faster than llama.cpp.
- **ExLlamaV3 counts tokens wrong.** TabbyAPI reports far too few completion tokens on long answers. Example: `p2_sliding_median` in run `20260927-081515` was reported as 2,222 tokens, but its text is 181,000 characters. That is about 55,000 tokens at the 3.3 characters per token measured on the llama.cpp runs. The wrong counts made EXL3 look as if it slowed down to 3–35 tok/s and thought less than llama.cpp; neither was true. `fix_token_counts.py` re-estimated the counts from the saved text for 40 tasks in 16 EXL3 runs (both PCs), and `run_eval.py` now does this by itself. The tables mark these counts with `~`.

# Part 3: Hard suite, both PCs (27–30 Sep)

All runs: [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md), raw data in `results_hard/`. Mean over runs.

| # | Model | Quant | GPU | Effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S (Strata) | 5090 | medium | 1 | **100.0%** | – | 20.0 | 138.2k | 116.3 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S (Strata) | 5090 | low | 1 | **97.8%** | – | 8.4 | 70.4k | 141.3 |
| 3 | Qwen3.8-Flash-Next | UD-Q4_K_XL | 5090 | medium | 2 | **95.8%** | 93–98 | 19.9 | 44.1k | 37.3 |
| 4 | Qwen3.8-27B | EXL3 6.0 bpw | 5090 | low | 1 | **94.4%** | – | **6.5** | ~46.1k | 121.9 |
| 5 | Qwen3.8-27B | EXL3 3.0 bpw | 4080 | medium | 2 | **93.1%** | 92–94 | 11.0 | ~54.0k | 82.9 |
| 6 | Qwen3.8-27B | AP IQ3_S | 4080 | medium | 3 | 87.8% | 83–94 | 17.8 | 67.4k | 63.9 |
| 7 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | 5090 | medium | 1 | 84.9% | – | 29.2 | 54.0k | 31.0 |
| 8 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | 5090 | low | 1 | 82.9% | – | 57.3 | 120.1k | 35.1 |
| 9 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | 5090 | high | 1 | 82.9% | – | 98.3 | ~80.2k | 13.6 |
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | high | 2 | 81.9% | 82–82 | 102.6 | ~65.9k | 10.7 |
| 11 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | 5090 | medium | 2 | 79.8% | 77–83 | 90.0 | 184.8k | 34.3 |
| 12 | GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | low | 2 | 77.9% | 71–84 | 19.4 | ~13.2k | 11.6 |
| 13 | Qwen3.8-27B | EXL3 6.0 bpw | 5090 | medium | 1 | 77.8% | – | 10.4 | ~67.6k | 110.4 |
| 14 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | 4080 | medium | 1 | 66.7% | – | 10.9 | ~53.9k | 83.2 |

Qwen3.8-27B UD-Q6_K_M, the base-suite winner, has not been run on the hard suite yet.

**`h_p3_line_diff` (minimal diff, needs Myers' algorithm) decides most of the ranking.** Only 8 of 21 runs solved it fully.

- **GLM-5.3-Flash at `high` hit the 60-minute limit on it in 3 of 3 runs**, both EXL3 and GSQ-RCO. At 11–14 tok/s it cannot think long enough within the hour, so each run took 90–115 minutes and scored about 82%.
- **Flash-Next GSQ-RCO IQ3_S in llama.cpp ran out of tokens on it in 3 of 3 runs**: 65,536 twice and 98,304 once, at about 34 tok/s after 32–50 minutes. The two runs of the same file in Strata solved it, with 28k tokens at `low` and 81k at `medium`. With one run each, this may be luck rather than a difference between the engines.
- **Flash-Next UD-Q4_K_XL, IQ3_XXS and 27B EXL3 at `low` solved it.**

**Other findings:**

- **Qwen3.8-27B EXL3 on the 5090, `low` against `medium`:**
  - At `low`: 94.4% in 6.5 min, the fastest good result.
  - At `medium`: 77.8%. Its `h_p3` run stopped inside its thinking after about 33k tokens.
  - In both runs it failed `h_t3_postfx_invert` the same way: it named a GLSL variable `output`, which is a reserved word, so the shader did not compile.
- **GLM `low` against `high`:** `low` is 5× faster (19 min) but scored 78%, with mistakes in physics, instanced picking, the interval set and the diff.
- **ExLlamaV3 stopped mid-thought in 3 tasks:** twice with `qv44` on the 4080 and once on the 5090. Each time the stream ended with `finish_reason = stop` while the model was still thinking. On the 5090 this happened at about 33k tokens, which matches a 32,768-token context. It is worth checking TabbyAPI's `max_seq_len` / cache size: it should be at least prompt + `--max-tokens`.
- **Three.js tasks are mostly solved.** Most misses are TypeScript compile errors from APIs that do not exist (`renderer.getDelta()`, `getAnimationLoop()`, `ShaderPass.name`, a wrong namespace), plus the `output` shader error above.

## Caveats

- **Few runs, temperature 1.0.** Most settings were run once, some 2–3 times. The repeats show how big the noise is: the same setting ranged over 16 points (EXL3 3.0 bpw `medium`: 84–100%). Treat differences under about 5 points as noise. The differences in time and token count are much more stable.
- **The base suite is too easy for the best settings.** Ten tasks, and the best already score about 100%, so it does not separate them. It mainly measures one-shot code writing, not long agentic work (where, according to the model cards, GLM and DeepSeek have an edge).
- **The hard suite still lacks Qwen3.8-27B Q6**, the base-suite winner, and most settings have one run.
- **Token limits differ.** Runs from 30 Sep used 98,304 tokens per task, earlier ones 65,536. This matters only for runs that hit the limit (Flash-Next IQ3_S on `h_p3`, which hit it either way).
- **Strata runs have one run per setting.** They are also a different engine from llama.cpp, so they compare engines as well as files. The 29 Sep Qwen3.8-27B EXL3 folders were renamed to add `6.0bpw`, which was missing from the label.
- **The two PCs are not directly comparable on time.** GPU, RAM and file size all differ.
- **Specific files, not models.** The quants differ in size, maker and backend, so this compares specific files on this hardware.
- **Labels and folders:**
  - The labels `qwen27b-q6-temp0-*` are misleading: those runs used temperature 1.0, not 0.
  - Some 4080 folders were renamed after the run (e.g. `-low` dropped from the hard-suite labels, which ran at `medium`). The tables use the folder names.
  - For `20260927-103037` the folder says plain EXL3 3.0 bpw, but the name stored in the run says `qv44`. It is counted as plain EXL3 3.0 bpw.
  - Some hard-suite labels do not say the level (e.g. `GLM-5.3-Flash-exl3-3.05bpw-HARD` at `high` and at `low`); the tables take the level from the run settings.

## Interrupted runs (no score, not in the table)

Their raw data has been removed from `results/` and `results_hard/`; only these notes remain.

- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `xhigh` (4 tasks): in `p2` and `t2` it thought for 240–250k characters and gave no answer.
- Qwen3.8-Flash-Next EXL3 5.05, second run (4 tasks): no answer in `p1` after about 100k characters of thinking.
- GLM-5.3-Flash GSQ-RCO 3.0-bit: three attempts, each stopped after 3 tasks.
- Qwen3.8-Flash-Next UD-Q4_K_XL, first attempt (2 tasks).
- Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS `xhigh` on the 4080 (1 task).
- Qwen3.8-27B AP IQ3_S, hard suite on the 4080: three attempts stopped after the first task.
- GLM-5.3-Flash EXL3, hard suite on the 5090:
  - `high` on 26 Sep, stopped after 4 tasks;
  - `max` on 26 Sep: the server stopped answering (timeouts) and no task was answered;
  - `high` on 29 Sep, stopped after 5 tasks.

Earlier tests from 24 Sep (temperature 0, 12,000-token limit, older script) are not comparable and are not included.

## Next steps

- **Everyday coding on a 32 GB card:** Qwen3.8-27B at `low`, Q6 in llama.cpp or EXL3 6.0 bpw in ExLlamaV3. Both reach 100% on the base suite in about 5 minutes, and EXL3 scored 94.4% on the hard suite in 6.5 min.
- **Hardest tasks, if time allows:** Qwen3.8-Flash-Next GSQ-RCO IQ3_S in Strata at `medium` (100% on the hard suite in 20 min) or UD-Q4_K_XL at `medium` (95.8%). Worth a second run of each before trusting the ranking.
- **On a 16 GB card:** Qwen3.8-27B EXL3 3.0 bpw at `low`, or AP IQ3_S at `medium` in llama.cpp. Avoid `qv44` and anything below 3 bits.
- **GLM-5.3-Flash:** fine on the base suite at `high`, but too slow for the hard suite on this hardware.
- **To fill the gaps:**
  - run Qwen3.8-27B Q6 on the hard suite at `low` and `medium`;
  - repeat the single-run hard-suite settings;
  - check TabbyAPI's context length (the mid-thought stops).

Rebuild the tables from the data with `python make_summary.py`.
