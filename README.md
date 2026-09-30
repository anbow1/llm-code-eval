# llm-code-eval — a quick coding test for local LLMs

The repository has two test suites, kept apart everywhere:

| | Base suite | Hard suite |
|---|---|---|
| Tasks | 10: 6 × TypeScript + Three.js, 4 × Python ([tasks.py](tasks.py)) | 6: 3 × TypeScript + Three.js, 3 × Python ([tasks_hard.py](tasks_hard.py)) |
| Run with | `python run_eval.py ...` | `python run_eval.py --suite hard ...` |
| Raw results | `results/` | `results_hard/` |
| Tables | [RESULTS_TABLE.md](RESULTS_TABLE.md) | [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md) |
| Compare | `python compare.py` | `python compare.py --hard` |

Full write-up for both: [SUMMARY.md](SUMMARY.md).

## Base suite: results (25–30 Sep 2026)

**The base suite no longer separates the best models: on the RTX 5090 seven settings score 100%.** The fastest of them take about 5 minutes. The reasoning level matters more than the choice of model: Qwen does best at `low`/`medium` (`xhigh` thinks 8× longer on code), GLM does best at `high`.

RTX 5090 32 GB + 128 GB RAM:

| Model | Quant | Backend | Effort | Score | Time | Total tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|
| Qwen3.8-27B | UD-Q6_K_M | llama.cpp | low | 100.0% | 4.7 min | 28.7k | 108.9 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S strata | llama.cpp | medium | 100.0% | 4.9 min | 34.8k | 129.0 |
| Qwen3.8-27B | EXL3 | ExLlamaV3 | low | 100.0% | 5.0 min | 30.5k | 108.1 |
| Qwen3.8-27B | EXL3 | ExLlamaV3 | medium | 100.0% | 6.5 min | ~42.7k | 114.7 |
| GLM-5.3-Flash | EXL3 3.05 bpw | ExLlamaV3 | high | 99.5% | 20.5 min | 15.0k | 12.4 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S | llama.cpp | low | 100.0% | 31.3 min | 65.6k | 35.3 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | llama.cpp | medium | 100.0% | 54.6 min | 72.1k | 22.2 |

**RTX 4080 16 GB + 32 GB RAM: Qwen3.8-27B at 3 bits almost matches Q6, at about half the speed.** The best are EXL3 3.0 bpw at `low` and AP IQ3_S at `medium`. Below 3 bits (EXL3 2.2 bpw) the score drops by about 10 points. Scores are means over 2–3 runs.

| Model | Quant | Effort | Runs | Mean score | Mean time | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|
| Qwen3.8-27B | AP IQ3_S | medium | 2 | 100.0% | 8.2 min | 34.6k | 73.0 |
| Qwen3.8-27B | EXL3 3.0 bpw | low | 3 | 98.5% | 7.3 min | ~34.7k | 83.8 |
| Qwen3.8-27B | EXL3 2.2 bpw | low | 3 | 87.8% | 9.6 min | ~39.6k | 76.2 |

All 42 base-suite runs and per-task scores: [RESULTS_TABLE.md](RESULTS_TABLE.md).

## Hard suite: results (27–30 Sep 2026)

**The hard suite separates the models.** Scores are means where a setting was run more than once. Qwen3.8-27B Q6 has not been run on it yet.

- **Best:** Qwen3.8-Flash-Next with "strata".
- **Fastest good result:** Qwen3.8-27B EXL3 at `low`.
- **GLM-5.3-Flash** hits the 60-minute limit on `h_p3_line_diff` at `high`.

| Model | Quant | GPU | Effort | Runs | Mean score | Mean time | Mean tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|---|---|
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S strata | 5090 | medium | 1 | 100.0% | 20.0 min | 138.2k | 116.3 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_S strata | 5090 | low | 1 | 97.8% | 8.4 min | 70.4k | 141.3 |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | 5090 | medium | 2 | 95.8% | 19.9 min | 44.1k | 37.3 |
| Qwen3.8-27B | EXL3 | 5090 | low | 1 | 94.4% | 6.5 min | ~46.1k | 121.9 |
| Qwen3.8-27B | EXL3 3.0 bpw | 4080 | medium | 2 | 93.1% | 11.0 min | ~54.0k | 82.9 |
| Qwen3.8-27B | AP IQ3_S | 4080 | medium | 3 | 87.8% | 17.8 min | 67.4k | 63.9 |
| GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | high | 2 | 81.9% | 102.6 min | ~65.9k | 10.7 |
| GLM-5.3-Flash | EXL3 3.05 bpw | 5090 | low | 2 | 77.9% | 19.4 min | ~13.2k | 11.6 |

All 21 hard-suite runs and per-task scores: [RESULTS_TABLE_HARD.md](RESULTS_TABLE_HARD.md).

Avg tok/s (from time) = all generated tokens ÷ total generation time. `~` = estimated from the text length: ExLlamaV3 (TabbyAPI) under-reports tokens on long answers, see `fix_token_counts.py`. "strata" and the bpw of the 5090 EXL3 run of Qwen3.8-27B are only known from the run labels.

## Setup (once)

```
pip install playwright pillow psutil
python -m playwright install chromium
```

You also need Node.js 20+ (`node -v`). On the first run the script installs three, typescript and esbuild into `ts_env/`.

## Running

Serve the model with any OpenAI-compatible server (llama.cpp, TabbyAPI, LM Studio, Ollama), then:

```
python run_eval.py --base-url http://localhost:8080/v1 --label qwen-flash-iq3xxs
```

Main options:
- `--label`: short name used in the report (instead of the long model path). Put the model and quant in it (e.g. `qwen27b-UD-Q3_K_XL`, `qwen27b-exl3-3.0bpw`): `make_summary.py` reads them from the name of the results folder, so renaming a folder fixes a wrong label. The GPU is recorded automatically (`nvidia-smi`).
- `--preset qwen-think` / `qwen-instruct` / `glm`: the sampling settings recommended by the model makers
- `--temperature 1.0`: default 1.0; `--top-p`, `--top-k`, `--min-p`, `--presence-penalty`, `--repetition-penalty` override the preset
- `--max-tokens 98304`: token limit per task, thinking included (default 98304; runs before 30 Sep used 65536)
- `--task-timeout-min 60`: time limit per task (default 60 min)
- `--budget-min 0`: time limit for the whole run, 0 = none (default)
- `--think off`: turns thinking off (`enable_thinking=false` in the Qwen/GLM chat template)
- `--reasoning-effort low`: reasoning level (e.g. low / medium / high / xhigh), if the chat template supports it
- `--reasoning-effort off,low,xhigh`: runs the full test once per level, each with its own report
- `--probe-effort`: quick probe. It asks one short question at each level (levels follow the preset: GLM `off,low,high,max`, Qwen `off,low,medium,xhigh`; or give your own, weakest first) and shows how long the model thinks and whether the server honours the level. 3 tries per level by default (`--probe-repeats`); `--probe-question hard` uses a harder question where the level matters more.
- `--suite hard`: run the hard suite instead of the base one (see [Hard suite: tasks](#hard-suite-tasks))
- `--only three` / `--only python`, `--tasks t5_raycast_click`: run only some tasks

| Preset | Settings |
|---|---|
| qwen-think | temperature 1.0, top_p 0.95, top_k 20, min_p 0, presence_penalty 0, repetition_penalty 1.0 |
| qwen-instruct | temperature 0.7, top_p 0.80, top_k 20, min_p 0, presence_penalty 1.5, repetition_penalty 1.0 (use with `--think off`) |
| glm | temperature 1.0, top_p 1.0 |

At temperature 1.0 results vary between runs. For comparisons, run each model twice.

Memory measurement needs `psutil`; VRAM is read from `nvidia-smi`.

Compare runs (latest run per name; `--all` shows every run):

```
python compare.py          # base suite
python compare.py --hard   # hard suite
```

Rebuild the result tables of both suites from the data:

```
python make_summary.py
```

Runs made with an older `run_eval.py` against ExLlamaV3 (TabbyAPI) may have token counts that are far too low. Run `python fix_token_counts.py` once to re-estimate them from the saved text; it keeps the server's numbers and is safe to run again.

## What is measured

- score and status of every task: `ok`, `max_tokens` (ran out of tokens), `task_timeout`, `no_answer` (stopped while still thinking), `server_crash`, `server_down`
- "fin.": average score over the tasks the model finished (separates quality from speed)
- time, tokens (including thinking tokens), generation speed (tok/s), time to first token
- peak VRAM and RAM, and how many GB were read from disk during the run
- the model's thinking is saved as `reasoning.md` next to its answer

## Base suite: tasks

Every Three.js task (in both suites) must:
- compile with `tsc --strict`
- load in the browser without console errors
- actually draw something (not a blank colour)
- handle window resizing
- pass its own checks (e.g. the cube rotates, a click selects the right cube, terrain normals point up)

| Task | What it tests |
|---|---|
| t1_cube | basics: scene, lights, delta-time animation |
| t2_solar | object hierarchy, orbits, PointLight |
| t3_instanced_wave | InstancedMesh with 10,000 cubes, performance |
| t4_shader_water | custom ShaderMaterial, GLSL, uniforms |
| t5_raycast_click | Raycaster, mouse clicks, selection state |
| t6_terrain | hand-built BufferGeometry, indices, winding order, OrbitControls from addons |

Python tasks have hidden tests (correctness + performance):

| Task | What it tests |
|---|---|
| p1_parse_duration | reading a spec carefully, edge cases |
| p2_sliding_median | algorithm + performance (200k items) |
| p3_topo_order | graphs, lexicographically smallest order, cycles |
| p4_gather_limited | asyncio: concurrency limit, ordering, cancellation on error |

## Hard suite: tasks

6 harder tasks to separate the models that score about 100% on the base suite. They live in `tasks_hard.py`, runs are saved to `results_hard/` and the run name gets a `-HARD` suffix. The Three.js tasks are checked the same way as in the base suite (plus their own checks below); the Python tasks have hidden tests.

| Task | What it tests |
|---|---|
| h_t1_physics | 20 balls in a box: mass-aware elastic collisions, energy conservation, no overlap; the test calls `step()` 600 times itself |
| h_t2_instanced_pick | 900 instances in one InstancedMesh, clicks toggle colour, also checked on screen (did the colour reach the GPU) |
| h_t3_postfx_invert | EffectComposer + custom colour-inverting shader; the on-screen result must be correct in sRGB (pass order) |
| h_p1_interval_set | interval set: merging, splitting, edge cases, O(log n) performance |
| h_p2_expr_eval | exact calculator: precedence, right-associative `^`, unary minus, functions, errors; 400 random expressions |
| h_p3_line_diff | minimal diff (LCS) with repeated lines; performance needs Myers' algorithm |

Examples:

```
python run_eval.py --suite hard --label qwen27b-q6 --preset qwen-think --reasoning-effort low,medium
python run_eval.py --suite hard --label glm-exl3 --preset glm --reasoning-effort high
python compare.py --hard
```

## Output

Each run is saved to `results/<date>_<name>/` (base suite) or `results_hard/<date>_<name>-HARD/` (hard suite):
- `report.md`: what passed, what failed and why
- `summary.json`: numbers for comparisons
- one folder per task with the model's full answer, its code, its thinking and `screenshot.png`

`make_summary.py` also writes `results_table.csv` into each of the two folders.

## Tips

- Use the preset recommended for the model.
- Thinking models can write for a very long time. If time runs out, lower the reasoning level, turn thinking off or lower `--max-tokens`.
- Tasks and tests live in `tasks.py` and `tasks_hard.py`; adding your own is easy.
