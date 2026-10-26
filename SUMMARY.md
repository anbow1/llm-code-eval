# Local model coding test: summary (25 Sep – 26 Oct 2026)

## TL;DR

- **Best overall: Qwen3.8-27B GSQ-RCO IQ3_XXS MTP at `medium` (llama.cpp, RTX 4080 16 GB): 99.2%** over both suites (base 100% in 8.4 min, hard 98.3% in 18 min), but on one run per suite (15–16 Oct). The best repeated setting is Qwen3.8-27B UD-Q6_K_M at `medium` on the RTX 5090: 98.1% (base 98.6%, hard 97.6%), in 4 and 9 minutes. See [top10.jpg](top10.jpg).
- **Base suite (10 tasks) is saturated.** Several settings on the RTX 5090 score 100%. The fastest are:
  - Qwen3.8-27B UD-Q6_K_M at `low`: 4.7 min;
  - Qwen3.8-27B EXL3 6.0 bpw at `low`: 5.0 min;
  - Qwen3.8-Flash-Next GSQ-RCO IQ3_S in the Strata engine at `low`: 5.2 min, 95.5% over 2 runs.
- **Hard suite (6 tasks) now has results from both PCs, and it separates the models.**
  - **Highest: Qwen3.8-Flash-Next GSQ-RCO IQ3_S in Strata at `medium`**: 100% in both runs (about 20 min). At `low` it scored 97.8% in 8.4 min (one run); at `xhigh` only 72.2%. Its base-suite repeats were less steady: at `medium` one run looped on `p2` and scored 87.5%.
  - **Qwen3.8-27B UD-Q6_K_M at `medium`: 97.6% in 9.0 min.** At `low` it scored 88.5%, because it got the diff task wrong.
  - **Fastest good result: Qwen3.8-27B EXL3 6.0 bpw at `low`**: 94.4% in 6.5 min.
  - **Qwen3.8-Flash-Next UD-Q4_K_XL at `medium`:** 90.3% over 3 runs (79–98%) in llama.cpp and 93.0% over 2 runs (86–100%) in Strata.
  - **GLM-5.3-Flash is the slowest and the least steady.** At `high` its best runs reach 97–100%, but its means are 80–90%. In llama.cpp and ExLlamaV3 it hit the 60-minute limit on `h_p3_line_diff` in 6 of 7 runs; in the Maya engine once in 15.
- **The Strata engine makes Flash-Next 2.2–3.7× faster than llama.cpp**, with the same file and the same memory use. IQ3_S runs at 125–141 tok/s from time against 35, UD-Q4_K_XL at 78–81 against 32–37. [Strata](https://github.com/Niko1221/Strata) v0.1.30 is an inference server built for MoE models on consumer GPUs; it manages which experts are cached on the GPU.
- **Qwen3.8-27B works on a 16 GB card.** On the RTX 4080 the best 3-bit files almost match Q6 on the 5090 on the base suite, at about half the speed: AP IQ3_S at `medium` (100% twice, 8.2 min) and EXL3 3.0 bpw at `low` (98.5% over 3 runs, 7.3 min). On the hard suite the new GSQ-RCO IQ3_XXS MTP scored 98.3% (one run, 18 min) and EXL3 3.0 bpw 92.6% over 3 runs. Below 3 bits quality drops. All 4080 results: [rtx4080.jpg](rtx4080.jpg).
- **The reasoning level matters more than the choice of model.** Qwen does best at `low`/`medium`; `xhigh` overthinks code. On the base suite `low` is enough, but on the hard suite Q6 did 9 points better at `medium`. GLM needs `high`.
- **ExLlamaV3 (TabbyAPI) under-reports tokens** on long answers. The counts were re-estimated from the saved text (marked `~`), and `run_eval.py` now corrects them by itself. ExLlamaV3 runs have also stopped mid-thought 3 times on the hard suite; see Part 3.
- **GLM-5.3-Flash has its own table** ([RESULTS_TABLE_GLM.md](RESULTS_TABLE_GLM.md)). In the Maya engine it runs about twice as fast on the hard suite and rarely hits the time limit. Its best hard-suite means are 90–92% (GSQ-RCO 3.5-bit in Maya, 6 runs, and EXL3 3.10 bpw in ExLlamaV3, 3 runs), against 80–83% for the older files in llama.cpp or ExLlamaV3. GLM scores 97–100% on the new practical and tool-calling suites. See Part 5.
- **DeepSeek-V4.1-Flash scored 100% in all 5 runs** (base suite once, hard suite 4 times at `low` and `high`). With 192 GB RAM it runs at 24–26 tok/s, twice as fast as with 128 GB, but the hard suite still takes 69–88 min. See Part 8. DeepSeek now has its own table and image, like GLM: [RESULTS_TABLE_DEEPSEEK.md](RESULTS_TABLE_DEEPSEEK.md), [deepseek.jpg](deepseek.jpg). See Part 7.
- **Per task, fewest tokens vs shortest time** ([tasks_base.jpg](tasks_base.jpg), [tasks_hard.jpg](tasks_hard.jpg)): GLM-5.3-Flash solves tasks with the fewest tokens, but Flash-Next in Strata and Qwen3.8-27B in VRAM solve them fastest, because they run 5–10 times faster.
- **Flash-Next in Strata, two new files on the hard suite (19–20 Oct):** UD-Q5_K_XL 100% in 8 min (one run), and NVFP4 GPTQ 100% and 93.2% in under 6 min at about 139 tok/s.
- **New scene suite (26 Oct): one large graphics task**, a boat on an ocean next to an island. Six of seven runs scored 90–100%, so the gallery ([scene_gallery.jpg](scene_gallery.jpg)) separates them better than the score. DeepSeek-V4.1 made the best islands, GLM-5.3 the best water, Qwen3.8-Flash-Next NVFP4 finished in 1.2 min with the crudest picture. See Part 9.
- **Maya stops thinking at about 32.8k tokens.** Since 12 Oct every long-thinking task in Maya ended at 32,776–32,836 thinking tokens, then the answer followed; DeepSeek in Strata does the same. This explains much of what looked like Maya's advantage on the hard suite (no time-outs, faster runs) and its wrong diffs. See Part 9.
- **At temperature 1.0, one run is not enough.** The same setting ranged over up to 19 points between runs (Flash-Next UD-Q4_K_XL on the hard suite: 79–98%).
- **Some settings keep failing the same task over repeated runs.** The tables now list them as "Problem tasks" / "Often fails" (below 90% in at least half the runs). Most common:
  - `h_p3_line_diff` for GLM-5.3-Flash at `high` (time-outs outside Maya, wrong diffs in Maya) and for Qwen3.8-27B AP IQ3_S on the 4080 (3 of 3);
  - `p2_sliding_median` for the 2–3-bit Qwen3.8-27B files and for Flash-Next UD-Q4_K_XL in Strata;
  - `h_t3_postfx_invert` for Flash-Next UD-Q4_K_XL in llama.cpp (2 of 3).

## Hardware and settings

- **PC A:** RTX 5090 32 GB VRAM + 128 GB DDR5 RAM, Windows; 192 GB RAM from the evening of 23 Oct (the tables mark those runs "+ 192 GB RAM"). All runs from 25 Sep and 28 Sep – 6 Oct.
- **PC B:** RTX 4080 16 GB VRAM + 32 GB DDR5 RAM, Windows. All Qwen3.8-27B 2–3-bit runs from 26–27 Sep.
- Backends: llama.cpp (`llama-server --jinja`), ExLlamaV3 (TabbyAPI), [Strata](https://github.com/Niko1221/Strata) v0.1.30 (an inference server for MoE models; Qwen3.8-Flash-Next from 30 Sep) and Maya (another inference engine; GLM-5.3-Flash from 9 Oct).
- Base suite, 10 tasks: 6 × TypeScript + Three.js, checked in a real browser (`tsc --strict` compile, rendering, animation, clicking, window resize), and 4 × Python with hidden correctness and performance tests. Hard suite: 6 tasks (`--suite hard`, see the README).
- Every run: temperature 1.0, sampling as recommended by the model makers (`--preset glm` / `qwen-think`), 60-minute limit per task. Token limit per task: 65,536; the runs from 30 Sep used 98,304 (the new default in `run_eval.py`).
- Many settings were run once; some 2–3 times. The tables show the mean.

The full tables, including every single run and the score per task, are in [RESULTS_TABLE.md](RESULTS_TABLE.md) (base suite) and [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md) (hard suite). Raw data (model code, thinking, screenshots) is in `results/` and `results_hard/`.

# Part 1: RTX 5090, base suite (25 Sep – 6 Oct)

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

## Repeats from 2 Oct

GLM-5.3-Flash EXL3 3.05 bpw was run again on the base suite, with a 98,304-token limit:
- **`high`: 99.2% in 31.0 min.** On 25 Sep it scored 99.5% in 20.5 min.
- **`low`: 84.0% in 11.0 min.** On 25 Sep it scored 82.9%.

`low` again thinks very little (1,000 thinking tokens for all 10 tasks). It lost points on the same kinds of things as before:
- the duration parser rejected "1h30m";
- `p4_gather_limited` timed out;
- `??` checks that TypeScript rejects as unreachable.

The repeats confirm the 25 Sep picture: GLM needs `high`.

## New runs from 3–6 Oct

| Model | Quant | Backend | Effort | Runs | Scores | Mean time (min) | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | low | repeat | 100.0% (first run 90.9%) | 5.4 | 125 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | Strata | medium | repeat | 87.5% (first run 100%) | 13.9 | 144 |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | Strata | medium | 2 | 98.2%, 93.7% | 7.2 | 78 |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | low | 2 | 85.4%, 85.8% | 9.2 | 12 |
| GLM-5.3-Flash | EXL3 3.05 bpw no MTP | ExLlamaV3 | high | 2 | 83.4%, 97.2% | 23.6 | 14 |

- **The Strata IQ3_S repeat at `medium` ran out of tokens on `p2_sliding_median`** (98,304 tokens, the model looped), so that setting now averages 93.8% over 2 runs. At `low` it averages 95.5%.
- **Flash-Next UD-Q4_K_XL in Strata: 96.0% in about 7 minutes.** The same file in llama.cpp took 29.5 min for 99.2%. So Strata is 2.5× faster here; that is less than with IQ3_S (3.7×).
- **GLM-5.3-Flash without MTP is neither faster nor better.** It ran at 12–14 tok/s, as before. At `low` it averaged 85.6% (83.5% with MTP); at `high` it averaged 90.3% (99.3% with MTP). One `high` run lost points to TypeScript errors (`renderer.getDelta()`, an undefined variable) and an asyncio timeout. With two runs each this is within noise.

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

# Part 3: Hard suite, both PCs (27 Sep – 6 Oct)

All runs: [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md), raw data in `results_hard/`. Mean over runs.

| # | Model | Quant | GPU | Effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S (Strata) | 5090 | medium | 1 | **100.0%** | – | 20.0 | 138.2k | 116.3 |
| 2 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S (Strata) | 5090 | low | 1 | **97.8%** | – | 8.4 | 70.4k | 141.3 |
| 3 | Qwen3.8-27B | UD-Q6_K_M | 5090 | medium | 1 | **97.6%** | – | 9.0 | 50.7k | 96.1 |
| 4 | Qwen3.8-27B | EXL3 6.0 bpw | 5090 | low | 1 | **94.4%** | – | 6.5 | ~46.1k | 121.9 |
| 5 | Qwen3.8-27B | EXL3 3.0 bpw | 4080 | medium | 3 | **92.6%** | 92–94 | 10.2 | ~51.2k | 84.7 |
| 6 | Qwen3.8-Flash-Next | UD-Q4_K_XL (Strata) | 5090 | medium | 2 | **93.0%** | 86–100 | 15.7 | 75.4k | 81.1 |
| 7 | Qwen3.8-Flash-Next | UD-Q4_K_XL | 5090 | medium | 3 | **90.3%** | 79–98 | 18.7 | 41.1k | 37.0 |
| 8 | Qwen3.8-27B | UD-Q6_K_M | 5090 | low | 1 | 88.5% | – | 8.1 | 47.1k | 99.3 |
| 9 | Qwen3.8-27B | AP IQ3_S | 4080 | medium | 3 | 87.8% | 83–94 | 17.8 | 67.4k | 63.9 |
| 10 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | 5090 | medium | 1 | 84.9% | – | 29.2 | 54.0k | 31.0 |
| 11 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | 5090 | low | 1 | 82.9% | – | 57.3 | 120.1k | 35.1 |
| 12 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | 5090 | high | 2 | 82.9% | 83–83 | 91.3 | ~74.5k | 13.6 |
| 13 | GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | high | 3 | 80.0% | 76–82 | 95.7 | ~61.1k | 10.7 |
| 14 | Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | 5090 | medium | 2 | 79.8% | 77–83 | 90.0 | 184.8k | 34.3 |
| 15 | GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | low | 2 | 77.9% | 71–84 | 19.4 | ~13.2k | 11.6 |
| 16 | Qwen3.8-27B | EXL3 6.0 bpw | 5090 | medium | 1 | 77.8% | – | 10.4 | ~67.6k | 110.4 |
| 17 | Qwen3.8-27B | EXL3 3.0 bpw qv44 | 4080 | medium | 1 | 66.7% | – | 10.9 | ~53.9k | 83.2 |

**On both suites together** (the average of the two scores, [top10.jpg](top10.jpg)), the top three are:
1. Qwen3.8-27B GSQ-RCO IQ3_XXS MTP on the 4080 at `medium`: 99.2% (one run per suite, 15–16 Oct).
2. Qwen3.8-27B Q6 at `medium`: 98.1%.
3. Qwen3.8-27B EXL3 6.0 bpw at `low`: 97.2%.
4. Flash-Next IQ3_S in Strata at `medium`: 96.9%. Before the 3 Oct base-suite repeat it was first with 100%.

**Best run against mean.** [top10_hard.jpg](top10_hard.jpg) and [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md) rank the settings both by their best run and by the mean of all runs. Only repeated settings can move between the two:
- **Flash-Next UD-Q4_K_XL moves the most.** In Strata it is 2nd by best run (99.6% in 7.7 min) but 6th by mean (93.0%). In llama.cpp it is 3rd by best run (98.1%) but 7th by mean (90.3%).
- **27B AP IQ3_S on the 4080** is 8th by best run (94.1%) and 9th by mean (87.8%).
- **27B EXL3 3.0 bpw on the 4080 is the steadiest:** 92–94% in all three runs.

**`h_p3_line_diff` (minimal diff, needs Myers' algorithm) decides most of the ranking.** Only 11 of 28 runs solved it fully.

- **GLM-5.3-Flash at `high` hit the 60-minute limit on it in 5 of 5 runs**: 3 with EXL3 and 2 with GSQ-RCO. At 11–14 tok/s it cannot think long enough within the hour, so each run took 82–116 minutes and scored 76–83%.
- **Flash-Next GSQ-RCO IQ3_S in llama.cpp ran out of tokens on it in 3 of 3 runs**: 65,536 twice and 98,304 once, at about 34 tok/s after 32–50 minutes. The two runs of the same file in Strata solved it, with 28k tokens at `low` and 81k at `medium`. With one run each, this may be luck rather than a difference between the engines.
- **Solved by:** Flash-Next UD-Q4_K_XL (2 of 3 runs in llama.cpp, 2 of 2 in Strata), IQ3_XXS, 27B EXL3 at `low` and 27B Q6 at `medium`. Q6 at `low` and the third UD-Q4_K_XL run wrote an answer, but the diff they produced did not rebuild the second file.

**Other findings:**

- **Flash-Next UD-Q4_K_XL in Strata (6 Oct):**
  - 99.6% in 7.7 min and 86.5% in 23.7 min. The weaker run lost points on physics and instanced picking.
  - It ran at 81 tok/s from time against 37 in llama.cpp.
  - The third llama.cpp run (5 Oct) scored 79.3%: it lost points on instanced picking and wrote a wrong diff.

- **Qwen3.8-27B Q6 (llama.cpp, 5090):**
  - At `medium`: 97.6% in 9.0 min. Its only miss was one random test of the interval set (86%).
  - At `low`: 88.5% in 8.1 min. It got `h_p3` wrong and raised `NameError` instead of `ValueError` for an unknown function in `h_p2`.
  - Both runs used about the same number of tokens (47–51k), at about 100 tok/s.
  - Unlike EXL3 6.0 bpw, Q6 compiled the post-processing shader and never stopped mid-thought.

- **Qwen3.8-27B EXL3 on the 5090, `low` against `medium`:**
  - At `low`: 94.4% in 6.5 min, the fastest good result.
  - At `medium`: 77.8%. Its `h_p3` run stopped inside its thinking after about 33k tokens.
  - In both runs it failed `h_t3_postfx_invert` the same way: it named a GLSL variable `output`, which is a reserved word, so the shader did not compile.
- **GLM `low` against `high`:** `low` is 5× faster (19 min) but scored 78%, with mistakes in physics, instanced picking, the interval set and the diff.
- **ExLlamaV3 stopped mid-thought in 3 tasks:** twice with `qv44` on the 4080 and once on the 5090. Each time the stream ended with `finish_reason = stop` while the model was still thinking. On the 5090 this happened at about 33k tokens, which matches a 32,768-token context. It is worth checking TabbyAPI's `max_seq_len` / cache size: it should be at least prompt + `--max-tokens`.
- **Three.js tasks are mostly solved.** Most misses are TypeScript compile errors from APIs that do not exist (`renderer.getDelta()`, `getAnimationLoop()`, `ShaderPass.name`, a wrong namespace), plus the `output` shader error above.

# Part 4: Practical limits and new suites (11 Oct)

**What counts as useful.** Across all 688 tasks run so far, 95% of the fully solved ones took under 10 minutes and under 19k tokens. Past 32k tokens only about half were solved, mostly because the model was lost or looping. The new `--limits practical` profile therefore allows 10 minutes and 32,768 tokens per task (tool tasks: 5 minutes) and a budget per suite: base 30, hard 30, practical 30, tools 15 minutes. See the README for the full numbers.

**The same limits applied to the existing runs** (column *Score @10 min/32k* in the results tables):
- **Dense Qwen3.8-27B is unaffected.** Q6, EXL3 and the 3-bit files on the 4080 keep their scores in both suites.
- **Flash-Next GSQ-RCO IQ3_S in Strata at `medium`** falls from 100% to 66.7% on the hard suite: its `h_p3` solution took 81k tokens. At `low` it keeps 97.8%, so under practical limits `low` is the better choice.
- **Flash-Next in llama.cpp and GLM-5.3-Flash lose 8–25 points.** They are too slow at 12–37 tok/s to finish the hard tasks in 10 minutes.
- **The best hard-suite settings under practical limits:**
  - Flash-Next IQ3_S in Strata at `low`: 97.8%;
  - Qwen3.8-27B Q6 at `medium`: 97.6%;
  - Qwen3.8-27B EXL3 6.0 bpw at `low`: 94.4%.

**New suites** (first results in Part 5):
- **`--suite practical`:** editing an existing module, fixing a bug from a CI failure, a refactor, SQL, JSON extraction, and a bug hunt in a ~25k-token module.
- **`--suite tools`:** tool calling against a fake shop backend, including a small coding agent.

**New stability measures:**
- **`--repeat N`** runs a suite N times. The tables then add a stability section: standard deviation, worst run, tasks solved in every run, identical answers (useful with `--temperature 0`).
- **"Broken"** is the share of tasks where generation itself failed.

# Part 5: GLM-5.3-Flash variants and the first practical and tool-calling runs (7–14 Oct)

All GLM variants in all suites: [RESULTS_TABLE_GLM.md](RESULTS_TABLE_GLM.md) and [glm_flash.jpg](glm_flash.jpg). New runs, all on the RTX 5090:

| Variant | Effort | Base | Hard | Practical | Tools |
|---|---|---|---|---|---|
| GLM-5.3-Flash GSQ-RCO 3.5-bit · Maya | low | 86.3% (2 runs) | 81.1% (1) | – | – |
| GLM-5.3-Flash GSQ-RCO 3.5-bit · Maya | high | 92.2% (5) | **90.1%** (5) | 97.6% (3) | **100.0%** (2) |
| GLM-5.3 Maya-M derisked · Maya | high | 85.1% (2) | 86.5% (4) | **98.8%** (4) | 99.6% (4) |
| GLM-5.3-Flash EXL3 3.05 bpw · Maya | high | **100.0%** (1) | 86.0% (6) | – | – |
| GLM-5.3-Flash EXL3 3.10 bpw · ExLlamaV3 | high | 95.5% (1) | 89.1% (2) | – | – |

**Engines and levels.**
- **Maya is an inference engine**, like llama.cpp, TabbyAPI or Strata.
- **"Derisked"** is the model file GLM-5.3 Maya-M derisked, run in Maya. The tables list it as GLM-5.3-Flash derisked, quant Maya-M.
- **There is no `medium` for GLM.** The GLM chat template has no `medium`, so the runs started with `medium` actually ran at `high`; the tables list them as `high`.

**Hard suite: Maya is about twice as fast and scores a little higher.** All the runs below are at `high`.
- **In llama.cpp and ExLlamaV3, GLM hit the 60-minute limit on `h_p3_line_diff` in 6 of 7 runs.** Runs took 59–96 minutes on average.
- **In Maya the limit was hit once in 15 runs** (derisked, 14 Oct).
  - Runs took 41–50 min on average.
  - `h_p3` was solved in 7 runs, answered wrongly in 5, abandoned mid-thought in 2 and timed out once.
- **GSQ-RCO 3.5-bit:** 90.1% in Maya (5 runs, 83–96%) against 82.9% in llama.cpp (2 runs).
- **EXL3 3.05 bpw:** 86.0% in Maya (6 runs, 69–100%) against 80.0% in ExLlamaV3 (3 runs), and 41 against 96 min per run. In Maya it finishes `h_p3` in about 30 minutes, but the diff was wrong in 4 of 6 runs.
- **EXL3 3.10 bpw in ExLlamaV3 (new, 14 Oct):** 89.1% over 2 runs (81.0 and 97.2%), 59 min per run. One run hit the limit on `h_p3`; the other solved it in 18 minutes.
- **Two GLM runs solved all six hard tasks:** derisked on 12 Oct (39 min) and EXL3 3.05 bpw in Maya on 14 Oct (35 min). Both settings also have runs at 69–77%, so their means are 86–87%.
- **Still slow for daily use.** With the practical limits (10 min, 32k tokens per task) GLM at `high` drops to 69–81% on the hard suite.

**Base suite.**
- **EXL3 3.05 bpw in Maya:** 100% in 13 min (one run, 13 Oct). EXL3 in ExLlamaV3 scored 99.3%.
- **GSQ-RCO 3.5-bit in Maya:** 92.2% over 5 runs (86.5–99.2%). The same file in llama.cpp scored 93.9% (one run).
- **EXL3 3.10 bpw in ExLlamaV3 (new):** 95.5% in 16 min (one run, 14 Oct); it lost points on `p1_parse_duration`.
- **GLM-5.3 Maya-M derisked:** 85.1% over 2 runs (13 Oct), the weakest GLM variant at `high` on this suite.
- **The same mistakes keep coming back:** `renderer.getDelta()` and `renderer.clock`, which do not exist in Three.js, `p2_sliding_median`, and asyncio in `p4`. One GSQ-RCO run thought through all 98,304 tokens on `t6_terrain` without answering.

**Practical suite (first results).** 97.6–98.8% in 3–5 minutes:
- **`w_refactor`:** the first derisked runs and the GSQ-RCO runs left `process_orders` longer than the 15 lines asked for.
- **`w_longctx` passed every time** (a ~25k-token prompt).

**Tool-calling suite (first results).** 99.6–100% in 2–3 minutes:
- every tool task passed, including the coding agent (5 tool calls, tests pass, the test file was left alone);
- the only miss was in `t_error`, in one run.

**Test fixes and re-grading (12 Oct).** Three checks were wrong, not the models. They were fixed and the saved answers graded again with the new `regrade.py`, without asking the model again:
- **`t_agent_fix` "tests not modified"** failed on Windows because writing the file turned `\n` into `\r\n`. Now the comparison ignores line endings. The six affected runs go from 88% to 100% on this task. This includes two runs from 12 Oct, made with a `tasks_tools.py` that did not have the fix yet; run `git pull` on the test PC.
- **`w_json` message 6** describes a parcel that was both late and crushed. Both `late` and `damaged` now count.
- **`w_refactor` "process_orders is short"** counted the docstring too. Now it counts only the body (at most 15 lines, as the prompt says).

**Removed on 12 Oct:**
- 10 runs that stopped early (one hard on 12 Oct, nine practical on 12 Oct);
- 2 hard-suite runs of EXL3 in Maya (started as `medium`, which runs at `high`). They ended in 15 seconds with 0 tokens and no answer to any task, so the server was not working rather than the model failing.

**Qwen3.8-Flash-Next in Strata (13–14 Oct).**
- **GSQ-RCO IQ3_S, hard suite, `medium`:** 100% again (19 min), so 100% in both runs.
- **GSQ-RCO IQ3_S, hard suite, `xhigh`:** 72.2% in 25 min. It thought through all 98,304 tokens on `h_p2_expr_eval` and got the diff in `h_p3` wrong (33%). As with the other Qwen models, `xhigh` is worse than `medium`.
- **GSQ-RCO IQ1_M, base suite, `medium`:** 45.1% in 4.4 min (151 tok/s). The Python tasks mostly pass, but five of six Three.js tasks fail: unterminated strings, broken syntax and a non-existent `renderer.canvas`. At 1 bit the model is fast but not usable for code.

**Flash-Next UD-Q4_K_XL in Strata, base suite repeats (7 Oct).**
- At `medium`: 100% in 10.3 min. Over 3 runs it now averages 97.3%.
- At `low`: 94.6% in 6.7 min. It lost points on `p2_sliding_median`.

# Part 6: new RTX 4080 runs (15–16 Oct)

All 4080 settings in one image: [rtx4080.jpg](rtx4080.jpg) (overall, base suite and hard suite, each ranked by best run and by mean, with time, tokens, tok/s and the tasks each setting keeps failing). New runs, all at `medium`. Base suite:

| Quant | Backend | Score | Time (min) | Tokens | tok/s | Notes |
|---|---|---|---|---|---|---|
| GSQ-RCO IQ3_XXS MTP | llama.cpp | **100.0%** | 8.4 | 34.5k | 72 | all 10 tasks solved, including `p2_sliding_median` (16 Oct) |

Hard suite:

| Quant | Backend | Score | Time (min) | Tokens | tok/s | Notes |
|---|---|---|---|---|---|---|
| GSQ-RCO IQ3_XXS MTP | llama.cpp | **98.3%** | 17.9 | 72.4k | 68 | first hard run of this file; solved `h_p3_line_diff` |
| EXL3 3.0 bpw | ExLlamaV3 | 91.7% | 8.7 | 45.5k | 89 | diff half right (`h_p3` 50%); now 92.6% over 3 runs |
| EXL3 2.2 bpw | ExLlamaV3 | 83.9% | 15.3 | 75.0k | 83 | first hard run; diff wrong (`h_p3` 17%) |

- **IQ3_XXS MTP is now first overall, on any GPU: 99.2%** (base 100%, hard 98.3%). That is one run per suite; at temperature 1.0 single runs can swing by 10–20 points, so repeating both suites is the next useful test.
- **It is much better than the abliterated IQ3_XXS without MTP** (86–88% on the base suite). It solved both tasks the other 4080 files keep failing: `p2_sliding_median` and `h_p3_line_diff`.
- **On the 4080 the hard suite again comes down to `h_p3_line_diff`.** It is solved by IQ3_XXS MTP. EXL3 3.0 bpw fails it in 2 of 3 runs and AP IQ3_S in 3 of 3.
- **The run with IQ3_XXS MTP was saved in `results/`;** it was moved to `results_hard/`, where hard-suite runs belong.
- **ExLlamaV3 token counts:** the new runs report 2.5–3.6 characters per token, so the counts are plausible and were not re-estimated.

# Part 7: DeepSeek-V4.1, new Flash-Next files and GLM repeats (18–21 Oct)

All on the RTX 5090.

**DeepSeek-V4.1-Flash in Maya (file Maya-S), base suite at `high`: 100%.**
- All 10 tasks solved, but it took 75 min (50k tokens at 11 tok/s from time). With the practical limits (10 min and 32k tokens per task) it would score 87.5%: `p4_gather_limited` took 19.5k tokens and too long.
- **Reasoning levels.** `--preset ds4` sends the level as a top-level `reasoning_effort`, exactly as Maya's own chat does (`none` for thinking off). The first version sent `thinking` and `chat_template_kwargs`, which Maya ignores, so every level ran at the default. Fixed on 20 Oct; the probe then showed `off` really turns thinking off (0 tokens, 1 of 3 answers right), while `low`, `high` and `max` think about as much on the probe question (340, 454 and 457 tokens). Whether `max` helps should show on the hard suite.
- The run folder was renamed from `DeepSeek-V4-Flash-…` to `DeepSeek-V4.1-Flash-…`: Maya's chat names the model `deepseek-v4.1-flash`.

**Qwen3.8-Flash-Next in Strata, hard suite at `medium`:**

| Quant | Runs | Mean | Runs' scores | Time (min) | Tokens | tok/s |
|---|---|---|---|---|---|---|
| UD-Q5_K_XL | 1 | **100.0%** | 100 | 8.0 | 46.1k | 99 |
| NVFP4 GPTQ | 2 | **96.6%** | 93.2, 100 | 5.7 | 45.8k | 139 |

- NVFP4 GPTQ is the fastest setting on the hard suite so far that also scores 100%. Its weaker run lost points on `h_t2_instanced_pick` (62%).
- With GSQ-RCO IQ3_S (100% twice), three Flash-Next files in Strata now reach 100% on the hard suite in 6–20 minutes.

**GLM-5.3-Flash at `high`, four more hard-suite runs (18–19 Oct):**
- GSQ-RCO 3.5-bit in Maya: 99.6% in 30 min. Mean now 91.7% over 6 runs.
- EXL3 3.05 bpw in Maya: 85.8%, diff wrong again (5 of 7 runs). Mean 86.0% over 7.
- EXL3 3.10 bpw in Maya (first run): 88.5%, diff wrong.
- EXL3 3.10 bpw in ExLlamaV3: 90.6%, `h_p3` solved in 29 min; `h_t2_instanced_pick` 46%. Mean now 89.6% over 3.
- Over all GLM hard runs at `high`: in Maya `h_p3_line_diff` was solved in 8 of 18 runs, wrong in 7, abandoned in 2, timed out once. In llama.cpp and ExLlamaV3 it was solved in 2 of 8 (both EXL3 3.10 bpw) and timed out in 6.

# Part 8: DeepSeek-V4.1 on the hard suite, 192 GB RAM, GLM repeats (21–24 Oct)

PC A got 192 GB of RAM on 23 Oct. Runs from then on are kept apart in the tables ("+ 192 GB RAM", RAM column in the GLM and DeepSeek tables): the large MoE models keep more experts in RAM and run faster. Two GLM runs from 22–23 Oct (EXL3 3.10 bpw in ExLlamaV3, GSQ-RCO in Maya) used at most 114 GB and are counted as 128 GB runs. An interrupted DeepSeek run from 20 Oct (2 tasks) was removed.

**DeepSeek-V4.1-Flash (build 1017), hard suite. Every run scored 100%:**

| File · engine | RAM | Level | Runs | Time (min) | Tokens | tok/s |
|---|---|---|---|---|---|---|
| Maya-S · Maya | 128 GB | low | 1 | 123.1 | 84k | 11 |
| Maya-S · Maya | 192 GB | high | 2 | 87.5, 77.7 | 120k | 24 |
| GSQ-RCO IQ2_XS · Strata | 192 GB | high | 1 | 69.0 | 109k | 26 |

- **192 GB RAM doubled the speed** (11 → 24–26 tok/s). The same file in the same engine on 128 GB ran the base suite at 11 tok/s too.
- **`low` against `high`:** `low` used fewer tokens on every hard task (84k in all against about 120k), but on 128 GB it still took the longest. A `low` run on 192 GB would separate the two effects.
- **GSQ-RCO IQ2_XS in Strata** is the fastest DeepSeek setting: 69 min.
- **Per task** (bottom of [deepseek.jpg](deepseek.jpg)): `h_t2_instanced_pick` is the cheapest (3–10k tokens, 4–8 min); `h_p3_line_diff` and `h_p1_interval_set` the most expensive (20–33k tokens, 12–35 min). DeepSeek solved `h_p3` in all 4 runs.
- **With the practical limits** (10 min and 32k tokens per task) the hard runs would score 33–50%.

**GLM-5.3-Flash at `high`, hard suite:**
- EXL3 3.10 bpw in ExLlamaV3: 98.1% in 35 min (22 Oct); mean now 91.7% over 4 runs, the best GLM mean.
- GSQ-RCO 3.5-bit in Maya: 85.7%, diff wrong (17%); mean 90.8% over 7.
- New file EXL3 4.05 bpw in Maya (192 GB): 92.9% in 25.5 min, `h_p3` solved in 11 min, `h_p1_interval_set` 57%.

# Part 9: scene suite and Maya's thinking limit (26 Oct)

**Scene suite, s1_ocean_island** (one large Three.js task: ocean with waves in a shader, a boat that floats on them, an island with swaying palms, sky, shadows, fog; 30 min). All runs on the RTX 5090 + 192 GB RAM:

| Model · quant · engine | Effort | Score | Time | Tokens (thinking) | Picture, by eye |
|---|---|---|---|---|---|
| Qwen3.8-Flash-Next NVFP4 GPTQ · Strata | medium | 100% | 1.2 min | 8.4k (1.6k) | crude: flat sand cone, blocky water |
| DeepSeek-V4.1-Flash GSQ-RCO IQ2_XS · Strata | high | 100% | 24.3 min | 39.5k (32.8k) | good |
| GLM-5.3-Flash GSQ-RCO 3.5-bit · Maya | high | 100% | 27.8 min | 40.0k (32.8k) | good water, island nearly black |
| DeepSeek-V4.1-Flash Maya-S · Maya | high, 180 min | 100% | 29.4 min | 41.8k (32.8k) | good, the most complete island |
| GLM-5.3-Flash EXL3 4.10 bpw · Maya | high, 180 min | 100% | 40.5 min | 40.7k (32.8k) | best water and sky, island dark |
| DeepSeek-V4.1-Flash Maya-S · Maya | high | 90% | 28.2 min | 43.4k (32.8k) | no water: shader compile error |
| GLM-5.3-Flash EXL3 4.10 bpw · Maya | high | 0% | 30 min | 30.9k | still thinking at the limit |

- **The checks are too lenient for this task.** They test what can be measured (the boat follows `heightAt`, leaves sway, shadows, fog, camera), and almost every model gets that right; the pictures are what differ. A run whose ocean shader failed to compile still scored 90%. Next: a check that the water is actually on screen, and a by-eye rating next to the score.
- **The gallery (by eye):** DeepSeek-V4.1 builds the most complete islands (sand, rocks, palms, shore foam); GLM-5.3 the best water and sky, but both GLM islands are almost black (lighting or materials too dark); Qwen3.8-Flash-Next NVFP4 is 20–30 times faster but its scene is the simplest.
- **The DeepSeek scene from Maya's chat** (the user's own longer prompt: pier, rowboat, lil-gui, bloom; about 3 hours) is far richer than any of these 30-minute results. It is not comparable: another prompt and no test hooks.

**Maya stops thinking at about 32.8k tokens.**
- In Maya, every task that thought long since 12 Oct ended at 32,776–32,836 thinking tokens (15 tasks: 10 hard-suite `h_p3_line_diff` runs of GLM and all 5 DeepSeek and GLM scene runs), and the answer came right after. Only two runs on 11 Oct thought longer (37k and 45k).
- llama.cpp, ExLlamaV3 and Strata with Qwen think up to the 98,304-token limit. DeepSeek in Strata also stopped at 32.8k on the scene task, so the limit may come from the DeepSeek chat template or from both engines; it is worth checking the engines' thinking-budget settings.
- **This changes the reading of Part 5.** GLM in Maya never timed out on `h_p3_line_diff` and ran about twice as fast partly because its thinking was cut at 32.8k; the wrong diffs in Maya (7 of 18) fit that too. The 180-minute scene runs changed nothing for the same reason (29 and 40 min).

## Caveats

- **Few runs, temperature 1.0.** Most settings were run once, some 2–3 times. The repeats show how big the noise is: the same setting ranged over 16 points (EXL3 3.0 bpw `medium`: 84–100%). Treat differences under about 5 points as noise. The differences in time and token count are much more stable.
- **The base suite is too easy for the best settings.** Ten tasks, and the best already score about 100%, so it does not separate them. It mainly measures one-shot code writing, not long agentic work (where, according to the model cards, GLM and DeepSeek have an edge).
- **Most hard-suite settings have one run.** That includes both Q6 runs and both Flash-Next IQ3_S runs in Strata.
- **Token limits differ.** Runs from 30 Sep used 98,304 tokens per task, earlier ones 65,536. This matters only for runs that hit the limit (Flash-Next IQ3_S on `h_p3`, which hit it either way).
- **Strata is a different engine from llama.cpp**, so its rows compare engines as well as files. The 29 Sep Qwen3.8-27B EXL3 folders were renamed to add `6.0bpw`, which was missing from the label.
- **The two PCs are not directly comparable on time.** GPU, RAM and file size all differ.
- **Specific files, not models.** The quants differ in size, maker and backend, so this compares specific files on this hardware.
- **GLM levels:** the GLM chat template has no `medium`; runs started with `medium` ran at `high` and are listed as `high`. The `-maya` label marks the Maya engine.
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
- 6–9 Oct, removed on 12 Oct:
  - Qwen3.8-Flash-Next GSQ-RCO IQ1_M in Strata: three base-suite attempts, each stopped after 3 tasks;
  - Flash-Next UD-Q4_K_XL in Strata at `low`, hard suite: stopped after 1 task;
  - GLM-5.3-Flash GSQ-RCO 3.5-bit in Maya: base `high` (2 tasks) and two hard-suite attempts (1 and 5 tasks).
- 12 Oct, removed the same day:
  - GLM in Maya: one hard-suite and nine practical-suite attempts that stopped after 1–2 tasks;
  - two hard-suite runs of EXL3 in Maya that ended in 15 seconds with no answer at all (server not working).
- GLM-5.3-Flash EXL3, hard suite on the 5090:
  - `high` on 26 Sep, stopped after 4 tasks;
  - `max` on 26 Sep: the server stopped answering (timeouts) and no task was answered;
  - `high` on 29 Sep, stopped after 5 tasks.
- Hard suite on 5 Oct, each stopped before or during `h_p3_line_diff`:
  - GLM-5.3-Flash EXL3 no MTP (5 tasks);
  - GLM-5.3-Flash GSQ-RCO 3.5-bit (5 tasks);
  - Qwen3.8-Flash-Next IQ3_S in Strata (4 tasks).

Earlier tests from 24 Sep (temperature 0, 12,000-token limit, older script) are not comparable and are not included.

## Next steps

- **Everyday coding on a 32 GB card:** Qwen3.8-27B Q6 in llama.cpp, or EXL3 6.0 bpw in ExLlamaV3.
  - `low` is enough for the base suite: 100% in about 5 minutes.
  - For harder tasks Q6 at `medium` is the safer choice: 97.6% on the hard suite in 9 minutes, against 88.5% at `low`.
- **A larger model, fast:** Qwen3.8-Flash-Next in Strata. IQ3_S at `low` is the most stable choice: 95.5% on the base suite (2 runs) and 97.8% on the hard suite, in about 5 and 8 minutes. At `medium` it scored higher on the hard suite but looped once on the base suite. Worth more hard-suite repeats before trusting the ranking.
- **On a 16 GB card:** Qwen3.8-27B EXL3 3.0 bpw at `low`, or AP IQ3_S at `medium` in llama.cpp. Avoid `qv44` and anything below 3 bits.
- **GLM-5.3-Flash:** fine on the base suite at `high`. On the hard suite use Maya (about twice as fast, almost no time-outs), and repeat runs: single runs range over 69–100%.
- **Next test round:** run all four suites with `--limits practical --repeat 2`, starting with the settings at the top of [top10.jpg](top10.jpg).
- **To fill the gaps:**
  - repeat the single-run hard-suite settings;
  - check TabbyAPI's context length (the mid-thought stops).

Rebuild the tables from the data with `python make_summary.py`.
