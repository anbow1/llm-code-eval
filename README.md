# llm-code-eval — a quick coding test for local LLMs

## Results (25 Sep 2026, RTX 5090 32 GB + 128 GB RAM)

**Winner: Qwen3.8-27B UD-Q6_K_M at reasoning effort `low` (llama.cpp): 100% in 4.7 min, 40 GB RAM.** The best large model is GLM-5.3-Flash EXL3 3.05 bpw at `high` (99.5% in 20.5 min, 118 GB RAM). The reasoning level matters more than the choice of model: Qwen does best at `low`/`medium` (`xhigh` thinks 8× longer on code), GLM does best at `high`.

| Model | Quant | Effort | Score | Time | Total tokens | Avg tok/s (from time) |
|---|---|---|---|---|---|---|
| Qwen3.8-27B | UD-Q6_K_M | low | 100.0% | 4.7 min | 28.7k | 108.9 |
| Qwen3.8-27B | UD-Q6_K_M | medium | 98.6% | 3.9 min | 22.2k | 105.3 |
| GLM-5.3-Flash | EXL3 3.05 bpw | high | 99.5% | 20.5 min | 15.0k | 12.4 |
| Qwen3.8-Flash-Next | UD-Q4_K_XL | medium | 99.2% | 29.5 min | 55.4k | 31.7 |
| Qwen3.8-Flash-Next | GSQ-RCO IQ3_XXS | medium | 100.0% | 54.6 min | 72.1k | 22.2 |

Avg tok/s (from time) = all generated tokens ÷ total generation time.

Full write-up: [SUMMARY.md](SUMMARY.md). All 12 runs and per-task scores: [RESULTS_TABLE.md](RESULTS_TABLE.md).

The base suite has 10 tasks: 6 × TypeScript + Three.js and 4 × Python, all checked automatically. A harder 6-task suite is described below.

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
- `--label`: short name used in the report (instead of the long model path)
- `--preset qwen-think` / `qwen-instruct` / `glm`: the sampling settings recommended by the model makers
- `--temperature 1.0`: default 1.0; `--top-p`, `--top-k`, `--min-p`, `--presence-penalty`, `--repetition-penalty` override the preset
- `--max-tokens 65536`: token limit per task, thinking included (default 65536)
- `--task-timeout-min 60`: time limit per task (default 60 min)
- `--budget-min 0`: time limit for the whole run, 0 = none (default)
- `--think off`: turns thinking off (`enable_thinking=false` in the Qwen/GLM chat template)
- `--reasoning-effort low`: reasoning level (e.g. low / medium / high / xhigh), if the chat template supports it
- `--reasoning-effort off,low,xhigh`: runs the full test once per level, each with its own report
- `--probe-effort`: quick probe. It asks one short question at each level (levels follow the preset: GLM `off,low,high,max`, Qwen `off,low,medium,xhigh`; or give your own, weakest first) and shows how long the model thinks and whether the server honours the level. 3 tries per level by default (`--probe-repeats`); `--probe-question hard` uses a harder question where the level matters more.
- `--suite hard`: run the harder 6-task suite instead of the base one
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
python compare.py
```

Rebuild the result tables from the data:

```
python make_summary.py
```

## What is measured

- score and status of every task: `ok`, `max_tokens` (ran out of tokens), `task_timeout`, `no_answer` (stopped while still thinking), `server_crash`, `server_down`
- "fin.": average score over the tasks the model finished (separates quality from speed)
- time, tokens (including thinking tokens), generation speed (tok/s), time to first token
- peak VRAM and RAM, and how many GB were read from disk during the run
- the model's thinking is saved as `reasoning.md` next to its answer

## What is checked

Every Three.js task must:
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

## Hard suite (`--suite hard`)

6 extra, harder tasks to separate the top models. Run them the same way with `--suite hard`; the run name gets a `-HARD` suffix.

| Task | What it tests |
|---|---|
| h_t1_physics | 20 balls in a box: mass-aware elastic collisions, energy conservation, no overlap; the test calls `step()` 600 times itself |
| h_t2_instanced_pick | 900 instances in one InstancedMesh, clicks toggle colour, also checked on screen (did the colour reach the GPU) |
| h_t3_postfx_invert | EffectComposer + custom colour-inverting shader; the on-screen result must be correct in sRGB (pass order) |
| h_p1_interval_set | interval set: merging, splitting, edge cases, O(log n) performance |
| h_p2_expr_eval | exact calculator: precedence, right-associative `^`, unary minus, functions, errors; 400 random expressions |
| h_p3_line_diff | minimal diff (LCS) with repeated lines; performance needs Myers' algorithm |

Example:

```
python run_eval.py --suite hard --label glm-exl3 --preset glm --reasoning-effort high,max
python run_eval.py --suite hard --label qwen27b-q6 --preset qwen-think --reasoning-effort medium,xhigh
```

## Output

Each run is saved to `results/<date>_<name>/`:
- `report.md`: what passed, what failed and why
- `summary.json`: numbers for comparisons
- one folder per task with the model's full answer, its code, its thinking and `screenshot.png`

## Tips

- Use the preset recommended for the model.
- Thinking models can write for a very long time. If time runs out, lower the reasoning level, turn thinking off or lower `--max-tokens`.
- Tasks and tests live in `tasks.py` and `tasks_hard.py`; adding your own is easy.
