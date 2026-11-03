# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-ENG

- Date: 2026-10-30 23:03
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 64.5 min (generation 64.1 min)
- Tokens: 83062 total, 65585 of them thinking
- Speed: 21.5 tok/s decode, first token after 4.6 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 133.9 GB (at start 127.5 GB) | Disk read: 1.2 GB
- Tasks: 1/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 20.0% |
| **Overall** | **20.0%** |
| Only tasks it finished | 40.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 40% | ok | 2244.0 | 50312 | 32835 | 22.5 |
| e2_rocket_launch | 0% | no_answer | 1600.9 | 32750~ | 32750 | 20.5 |

## e1_watch_unitas — 40%
- FAIL compiles_strict
- FAIL loads
- PASS renders
- FAIL resize
- PASS no_console_errors
  - note: src/e1_watch_unitas.ts(1168,3): error TS7053: Element implicitly has an 'any' type because expression of type '"focus"' can't be used to index type '{}'.

## e2_rocket_launch — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: model stopped inside its thinking and never wrote an answer
  - note: no code in the answer
