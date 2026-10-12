# Results table: practical suite (--suite practical)

6 everyday tasks: edit a module, fix a bug from a failing test, refactor, SQL, JSON extraction, and a bug hunt in a ~24k-token module (long context).

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GLM-5.3-Flash derisked | maya | llama.cpp | RTX 5090 32 GB | medium | 2 | **97.6%** | 98–98 | 97.6% | 0% | 3.2 | 3.6k | 18.4 | 31.1 |
| 2 | GLM-5.3-Flash | GSQ-RCO 3.5-bit maya | llama.cpp | RTX 5090 32 GB | medium | 2 | **97.6%** | 98–98 | 97.6% | 0% | 5.2 | 3.8k | 11.9 | 31.2 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend.

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash derisked | maya | llama.cpp | RTX 5090 32 GB | medium | 1 | 2 | **97.6%** | 0.0 | 97.6% | 5/6 | 0% | 3/6 |
| GLM-5.3-Flash | GSQ-RCO 3.5-bit maya | llama.cpp | RTX 5090 32 GB | medium | 1 | 2 | **97.6%** | 0.0 | 97.6% | 5/6 | 0% | 2/6 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11.10 16:54 | GLM-5.3-Flash derisked | maya | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 97.6 | n/a | 3.2 | 3.4k | 1.5k | 1.9k | **18.0** | 21 | 31.1 | 102.6 |
| 2 | 11.10 16:58 | GLM-5.3-Flash derisked | maya | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 97.6 | n/a | 3.3 | 3.7k | 1.8k | 1.9k | **19.1** | 21 | 31.1 | 101.5 |
| 3 | 11.10 19:22 | GLM-5.3-Flash | GSQ-RCO 3.5-bit maya | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 97.6 | n/a | 3.8 | 2.7k | 0.7k | 2.0k | **11.8** | 13 | 31.2 | 113.4 |
| 4 | 11.10 19:16 | GLM-5.3-Flash | GSQ-RCO 3.5-bit maya | llama.cpp | RTX 5090 32 GB | medium | **97.6%** | 97.6 | n/a | 6.7 | 4.8k | 2.8k | 2.0k | **12.1** | 13 | 31.2 | 113.5 |

## Score per task (%)

| Run | Model / effort | w_bugfix | w_edit | w_json | w_longctx | w_refactor | w_sql |
|---|---|---|---|---|---|---|---|
| 11.10 16:54 | GLM-5.3-Flash derisked maya (llama.cpp) / medium | 100 | 100 | 100 | 100 | 86 | 100 |
| 11.10 16:58 | GLM-5.3-Flash derisked maya (llama.cpp) / medium | 100 | 100 | 100 | 100 | 86 | 100 |
| 11.10 19:22 | GLM-5.3-Flash GSQ-RCO 3.5-bit maya (llama.cpp) / medium | 100 | 100 | 100 | 100 | 86 | 100 |
| 11.10 19:16 | GLM-5.3-Flash GSQ-RCO 3.5-bit maya (llama.cpp) / medium | 100 | 100 | 100 | 100 | 86 | 100 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
