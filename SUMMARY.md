# Local model coding test: summary (25 Sep 2026)

## TL;DR

- **Winner: Qwen3.8-27B UD-Q6_K_M at reasoning effort `low` (llama.cpp): 100% in 4.7 min, 40 GB RAM.** No larger model scored higher, and every one was 4 to 40 times slower.
- Best large model: GLM-5.3-Flash EXL3 3.05 bpw at `high`: 99.5% in 20.5 min, but it needs 118 GB RAM.
- The reasoning level matters more than the choice of model. Qwen works best at `low`/`medium`; `xhigh` thinks 8× longer on code and does not write better code. GLM works best at `high`: `low` makes mistakes and `max` is 10× slower.
- The base test (10 tasks) is now too easy for the best models. A harder suite (`--suite hard`) was added to tell them apart.

## Hardware and settings

- RTX 5090 32 GB VRAM + 128 GB DDR5 RAM, Windows.
- Backends: llama.cpp (`llama-server --jinja`) and ExLlamaV3 (TabbyAPI).
- 10 tasks: 6 × TypeScript + Three.js (checked in a real browser: `tsc --strict` compile, rendering, animation, clicking, window resize) and 4 × Python (hidden correctness and performance tests).
- Every run in the table: temperature 1.0, sampling as recommended by the model makers (`--preset glm` / `qwen-think`), 65,536-token and 60-minute limit per task.
- Each setting was run once.

The full table with per-task scores is in [RESULTS_TABLE.md](RESULTS_TABLE.md). Raw data (model code, thinking, screenshots) is in `results/`.

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
| 10 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | max | 87.5% | 205.8 | ~65.8k | ~62.2k | 5.3 | 120.5 |
| 11 | GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | low | 82.9% | 13.7 | 9.6k | 1.0k | 11.9 | 119.7 |
| 12 | Qwen3.8-Flash-Next | EXL3 5.05 bpw | ExLlamaV3 | xhigh | 79.2% | 84.7 | ~53.6k | ~51.4k | 10.6 | 83.3 |

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
| Qwen3.8-Flash-Next EXL3 `xhigh` | 79.2% | 84.7 min | ~53.6k | 10.6 | generation failures |
| GLM-5.3-Flash EXL3 `max` | 87.5% | 205.8 min | ~65.8k | 5.3 | hit the time limit |

Test time = tokens ÷ speed. A model finishes fast either because it writes fast (Qwen 27B: about 105 tok/s) or because it thinks briefly (GLM `high`: 15k tokens at 12 tok/s).

- **Qwen3.8-27B wins clearly.** 100% in 4.7 minutes. Only the same model at `medium` is faster (3.9 min, 98.6%); every other setting is slower and no better. It runs at about 109 tok/s because it fits entirely in VRAM.
- **The large MoE models are slow on this hardware.** They manage 5–34 tok/s (from time) because most experts sit in system RAM. Qwen 27B fits entirely in VRAM and does 87–109 tok/s.
- The fastest large model is Qwen Flash-Next (EXL3 33.6 and UD-Q4_K_XL 31.7 tok/s from time). GLM manages only 12.4 tok/s but thinks briefly (15k tokens at `high`), so it finishes in 20 minutes. Qwen Flash-Next thinks 2–8 times longer than GLM `high`.
- The slowdowns in some GLM `max` tasks (down to 2.7 tok/s) coincided with RAM use of about 120 of 128 GB. Windows may have started paging memory to disk.

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
- `max` thinks 8× longer than `high`, takes 206 min and hit the time limit on one task.
- **For code: `high`.**

## Caveats

- Each setting was run once at temperature 1.0. Differences of a few points may be noise. The differences in time and token count, however, repeated on every task.
- 10 tasks is a small set, and the best models already score about 100%, so the base test does not separate their quality. It mainly measures one-shot code writing, not long agentic work (where, according to the model cards, GLM and DeepSeek have an edge).
- The labels `qwen27b-q6-temp0-*` are misleading: those runs used temperature 1.0, not 0.
- Timing depends on machine load and RAM pressure during the run.
- The quants differ in size and backend, so this compares specific files on this hardware, not the models themselves.

## Interrupted runs (no score, not in the table)

- Qwen3.8-Flash-Next GSQ-RCO IQ3_XXS `xhigh` (4 tasks): in `p2` and `t2` it thought for 240–250k characters and gave no answer.
- Qwen3.8-Flash-Next EXL3 5.05, second run (4 tasks): no answer in `p1` after about 100k characters of thinking.
- GLM-5.3-Flash GSQ-RCO 3.0-bit: three attempts, each stopped after 3 tasks.
- Qwen3.8-Flash-Next UD-Q4_K_XL, first attempt (2 tasks).

Earlier tests from 24 Sep (temperature 0, 12,000-token limit, older script) are not comparable and are not included.

## Next steps

- Everyday coding: Qwen3.8-27B Q6 at `low` or `medium` (`--chat-template-kwargs "{\"reasoning_effort\":\"low\"}"`).
- If a larger model is needed: GLM-5.3-Flash EXL3 3.05 bpw at `high`.
- To separate the top models: run the hard suite (`--suite hard`) and repeat each run 2–3 times.

Rebuild the tables from the data with `python make_summary.py`.
