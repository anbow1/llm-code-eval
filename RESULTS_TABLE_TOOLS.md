# Results table: tool-calling suite (--suite tools)

7 tasks against a fake shop backend: pick the right tool, fill the arguments, chain calls, parallel calls, recover from an error, answer without a tool, and a small coding agent that fixes a repo.

Hardware: RTX 5090 32 GB + 128 GB RAM, and RTX 4080 16 GB + 32 GB DDR5 (the GPU column says which). All runs: temperature 1.0, sampling preset recommended by the model maker, 60-minute and 65,536-token limit per task (98,304 tokens in the runs from 30 Sep). Settings that were run more than once are averaged under "Mean per setting"; every single run is listed under "Every run".

## Mean per setting

**Score @10 min/32k** = the score if every task had to finish within 10 minutes and 32,768 tokens (the `--limits practical` profile; later tasks count as 0). **Broken** = share of tasks where generation itself failed: ran out of tokens or time, stopped mid-thought, looped, or gave no final answer.

| # | Model | Quant | Backend | GPU | Reasoning effort | Runs | Mean score | Min–max | Score @10 min/32k | Broken | Mean time (min) | Mean tokens | Avg tok/s (from time) | VRAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | medium | 2 | **100.0%** | 100–100 | 100.0% | 0% | 3.0 | 1.2k | 6.7 | 31.2 |
| 2 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | medium | 2 | **99.2%** | 98–100 | 99.2% | 0% | 1.9 | 1.2k | 10.4 | 31.1 |

## Stability (settings run 2+ times)

**Solved every run** = tasks with 100% in all runs. **Identical answers** = tasks where every run produced exactly the same code or answer; expect 0 at temperature 1.0, and close to all at temperature 0 on a deterministic backend.

| Model | Quant | Backend | GPU | Effort | Temp. | Runs | Mean | Std dev | Worst | Solved every run | Broken | Identical answers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | medium | 1 | 2 | **100.0%** | 0.0 | 100.0% | 7/7 | 0% | 3/7 |
| GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | medium | 1 | 2 | **99.2%** | 1.1 | 98.4% | 6/7 | 0% | 2/7 |

## Every run

| # | Run | Model | Quant | Backend | GPU | Reasoning effort | Score | Python | Three.js | Time (min) | Total tokens | of which thinking | Answer | Avg tok/s (from time) | tok/s (decode) | VRAM GB | RAM GB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11.10 14:01 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | medium | **100.0%** | n/a | n/a | 1.9 | 1.1k | 0.2k | 0.9k | **10.2** | 24 | 31.1 | 98.9 |
| 2 | 11.10 19:09 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | medium | **100.0%** | n/a | n/a | 2.9 | 1.1k | 0.2k | 0.9k | **6.4** | 14 | 31.2 | 113.7 |
| 3 | 11.10 19:12 | GLM-5.3-Flash | GSQ-RCO 3.5-bit | Maya | RTX 5090 32 GB | medium | **100.0%** | n/a | n/a | 3.0 | 1.2k | 0.2k | 1.0k | **6.8** | 15 | 31.2 | 113.7 |
| 4 | 11.10 14:03 | GLM-5.3-Flash derisked | Maya-M | Maya | RTX 5090 32 GB | medium | **98.4%** | n/a | n/a | 1.9 | 1.2k | 0.2k | 1.0k | **10.6** | 24 | 31.1 | 98.9 |

## Score per task (%)

| Run | Model / effort | t_agent_fix | t_args | t_chain | t_error | t_no_tool | t_parallel | t_select |
|---|---|---|---|---|---|---|---|---|
| 11.10 14:01 | GLM-5.3-Flash derisked Maya-M (Maya) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 11.10 19:09 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 11.10 19:12 | GLM-5.3-Flash GSQ-RCO 3.5-bit (Maya) / medium | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 11.10 14:03 | GLM-5.3-Flash derisked Maya-M (Maya) / medium | 100 | 100 | 100 | 89 | 100 | 100 | 100 |

- **Avg tok/s (from time)** = all generated tokens ÷ total generation time of all tasks (including prompt processing and waiting for the first token). This is the real working speed.
- **tok/s (decode)** = average over tasks, measured from the first token to the end (pure writing speed).
- `~` = token count partly estimated: the server did not report it for some tasks, or under-reported it (ExLlamaV3 / TabbyAPI on long answers), so it was estimated from the text length (see `fix_token_counts.py`).
- (limit) = ran out of tokens, (time) = hit the 60-minute limit, (none) = stopped while still thinking, no answer.
