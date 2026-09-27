# Local model coding test: summary (25–27 Sep 2026)

## TL;DR

- **Winner on the RTX 5090: Qwen3.8-27B UD-Q6_K_M at reasoning effort `low` (llama.cpp): 100% in 4.7 min.** No larger model scored higher, and every one was 4 to 40 times slower.
- **Qwen3.8-27B also works on a 16 GB card.** On the RTX 4080, the best 3-bit files score almost the same as Q6 on the 5090 on the base suite, at about half the speed:
  - AP IQ3_S (llama.cpp) at `medium`: 100% in both runs, 8.2 min on average.
  - EXL3 3.0 bpw (ExLlamaV3) at `low`: 98.5% over 3 runs, 7.3 min.
- **On the hard suite, EXL3 3.0 bpw is the best 3-bit file**: 93.1% (2 runs) in 11 min. AP IQ3_S scores 87.8% (3 runs) and takes 18 min, because it generates more tokens (67k against 54k) and writes more slowly (64 against 83 tok/s from time). With the `qv44` variant, EXL3 3.0 bpw stopped mid-thought twice and scored 66.7%.
- **Below 3 bits quality drops.** EXL3 2.2 bpw scores 86–88% and varies a lot between runs (78–94%). The abliterated GSQ-RCO files score lower than the plain AP files (91% against 96% on average).
- **The reasoning level matters more than the choice of model.** Qwen does best at `low`/`medium` and `xhigh` overthinks code. GLM does best at `high`. Which of `low`/`medium` is better depends on the file: GGUF did better at `medium`, EXL3 at `low`.
- **ExLlamaV3 (TabbyAPI) under-reports tokens on long answers**, e.g. 2,222 tokens for 181,000 characters. The counts for its runs were re-estimated from the saved text (`fix_token_counts.py`, marked `~`). With the corrected counts, EXL3 generates at a steady 76–84 tok/s on the 4080, faster than llama.cpp (65–75). The earlier "slowdowns" were an artefact of the wrong counts.
- **At temperature 1.0, one run is not enough.** The same file and setting ranged from 84 to 100% (EXL3 3.0 bpw `medium`) and from 78 to 94% (EXL3 2.2 bpw `low`).

## Hardware and settings

- **PC A:** RTX 5090 32 GB VRAM + 128 GB DDR5 RAM, Windows. All runs from 25 Sep.
- **PC B:** RTX 4080 16 GB VRAM + 32 GB DDR5 RAM, Windows. All Qwen3.8-27B 2–3-bit runs from 26–27 Sep.
- Backends: llama.cpp (`llama-server --jinja`) and ExLlamaV3 (TabbyAPI).
- Base suite, 10 tasks: 6 × TypeScript + Three.js, checked in a real browser (`tsc --strict` compile, rendering, animation, clicking, window resize), and 4 × Python with hidden correctness and performance tests. Hard suite: 6 tasks (`--suite hard`, see the README).
- Every run: temperature 1.0, sampling as recommended by the model makers (`--preset glm` / `qwen-think`), 65,536-token and 60-minute limit per task.
- On the 5090 each setting was run once. On the 4080 several settings were run 2–3 times; the tables show the mean.

The full tables, including every single run and the score per task, are in [RESULTS_TABLE.md](RESULTS_TABLE.md) (base suite) and [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md) (hard suite). Raw data (model code, thinking, screenshots) is in `results/` and `results_hard/`.

# Part 1: RTX 5090 (25 Sep)

## Results

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

## Hard suite

All runs: [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md), raw data in `results_hard/`.

No model has been run on the hard suite on the 5090 yet, so there is no Q6 reference.

| Quant | Backend | Effort | Runs | Mean score | Min–max | Mean time (min) | Mean tokens | Decode tok/s |
|---|---|---|---|---|---|---|---|---|
| EXL3 3.0 bpw | ExLlamaV3 | medium | 2 | **93.1%** | 92–94 | 11.0 | ~54.0k | 81–91 |
| AP IQ3_S | llama.cpp | medium | 3 | 87.8% | 83–94 | 17.8 | 67.4k | 73–78 |
| EXL3 3.0 bpw qv44 | ExLlamaV3 | medium | 1 | 66.7% | – | 10.9 | ~53.9k | 88 |

- **Three.js tasks: 100% in every run.** Physics, instanced picking and post-processing all passed.
- **Python tasks separate the runs.** `h_p3_line_diff` (Myers diff) is the hardest. AP IQ3_S hit the 65,536-token limit on it once, while still thinking, and failed the correctness tests once (17%). `h_p2_expr_eval` mostly passes; one repeated mistake is raising `NameError` instead of `ValueError` for an unknown function.
- **AP IQ3_S is slower and does not score higher.** It thinks somewhat longer (38–91k thinking tokens against 45–47k for EXL3) and writes more slowly.
- **`qv44` broke generation.** In `h_p2` and `h_p3` the model stopped inside its thinking after about 9k and 17k tokens (once after a loop) and never wrote code. The other four tasks were fine.

## Speed on the 4080

- **llama.cpp (GGUF): steady 73–81 tok/s decode**, 65–75 tok/s from time. That is about 65% of Q6 on the 5090.
- **ExLlamaV3 (EXL3): steady 81–97 tok/s decode**, 76–84 tok/s from time, so about 15% faster than llama.cpp.
- **ExLlamaV3 counts tokens wrong.** TabbyAPI reports far too few completion tokens on long answers. Example: `p2_sliding_median` in run `20260927-081515` was reported as 2,222 tokens, but its text is 181,000 characters. That is about 55,000 tokens at the 3.3 characters per token measured on the llama.cpp runs. The wrong counts made EXL3 look as if it slowed down to 3–35 tok/s and thought less than llama.cpp; neither was true. `fix_token_counts.py` re-estimated the counts from the saved text for 40 tasks in 16 EXL3 runs (both PCs), and `run_eval.py` now does this by itself. The tables mark these counts with `~`.

## Caveats

- **Few runs, temperature 1.0.** On the 5090 each setting was run once; on the 4080 many settings were run only once or twice. The repeats show how big the noise is: the same setting ranged over 16 points (EXL3 3.0 bpw `medium`: 84–100%). Treat differences under about 5 points as noise. The differences in time and token count are much more stable.
- **The base suite is too easy for the best settings.** Ten tasks, and the best already score about 100%, so it does not separate them. It mainly measures one-shot code writing, not long agentic work (where, according to the model cards, GLM and DeepSeek have an edge).
- **The hard suite has no reference yet.** It has only been run on the 4080, and only at `medium`.
- **The two PCs are not directly comparable on time.** GPU, RAM and file size all differ.
- **Specific files, not models.** The quants differ in size, maker and backend, so this compares specific files on this hardware.
- **Labels and folders:**
  - The labels `qwen27b-q6-temp0-*` are misleading: those runs used temperature 1.0, not 0.
  - Some 4080 folders were renamed after the run (e.g. `-low` dropped from the hard-suite labels, which ran at `medium`). The tables use the folder names.
  - For `20260927-103037` the folder says plain EXL3 3.0 bpw, but the name stored in the run says `qv44`. It is counted as plain EXL3 3.0 bpw.

## Interrupted runs (no score, not in the table)

Their raw data has been removed from `results/` and `results_hard/`; only these notes remain.

- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `xhigh` (4 tasks): in `p2` and `t2` it thought for 240–250k characters and gave no answer.
- Qwen3.8-Flash-Next EXL3 5.05, second run (4 tasks): no answer in `p1` after about 100k characters of thinking.
- GLM-5.3-Flash GSQ-RCO 3.0-bit: three attempts, each stopped after 3 tasks.
- Qwen3.8-Flash-Next UD-Q4_K_XL, first attempt (2 tasks).
- Qwen3.8-27B abliterated GSQ-RCO IQ3_XXS `xhigh` on the 4080 (1 task).
- Qwen3.8-27B AP IQ3_S, hard suite on the 4080: three attempts stopped after the first task.

Earlier tests from 24 Sep (temperature 0, 12,000-token limit, older script) are not comparable and are not included.

## Next steps

- **Everyday coding on a 32 GB card:** Qwen3.8-27B Q6 at `low` or `medium` (`--chat-template-kwargs "{\"reasoning_effort\":\"low\"}"`).
- **On a 16 GB card:** Qwen3.8-27B EXL3 3.0 bpw at `low`. It is the fastest (~84 tok/s), the most stable over repeats and the best on the hard suite. AP IQ3_S at `medium` in llama.cpp is equally good on the base suite and has a steadier speed. Avoid the `qv44` variant and anything below 3 bits.
- **If a larger model is needed:** GLM-5.3-Flash EXL3 3.05 bpw at `high`.
- **Get a hard-suite reference:** run Qwen3.8-27B Q6 on the 5090 with `--suite hard` at `low` and `medium`.
- **Fill the gaps on the 4080:** EXL3 3.0 bpw at `low` on the hard suite, and a second run of the settings run only once.

Rebuild the tables from the data with `python make_summary.py`.
