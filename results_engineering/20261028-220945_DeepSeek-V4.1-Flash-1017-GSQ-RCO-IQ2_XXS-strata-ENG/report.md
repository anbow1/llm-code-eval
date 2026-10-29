# DeepSeek-V4.1-Flash-1017-GSQ-RCO-IQ2_XXS-strata-ENG

- Date: 2026-10-28 22:42
- Model: local
- Endpoint: http://localhost:8080/v1 (preset ds4, temperature 1.0, top_p 1.0, max_tokens 196608, think default, effort high)
- Total time: 32.8 min (generation 32.4 min)
- Tokens: 54942 total, 40173 of them thinking
- Speed: 28.1 tok/s decode, first token after 9.7 s on average
- Peak VRAM: 31.4 GB | Peak RAM: 128.4 GB (at start 123.6 GB) | Disk read: 8.4 GB
- Tasks: 1/2 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| TypeScript + Three.js | 10.0% |
| **Overall** | **10.0%** |
| Only tasks it finished | 20.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| e1_watch_unitas | 20% | ok | 1671.2 | 47603 | 32834 | 28.7 |
| e2_rocket_launch | 0% | no_answer | 273.6 | 7339 | 7339 | 27.6 |

## e1_watch_unitas — 20%
- FAIL compiles_strict
- FAIL loads
- PASS renders
- FAIL resize
- FAIL no_console_errors
  - note: src/e1_watch_unitas.ts(1542,3): error TS7053: Element implicitly has an 'any' type because expression of type '"focus"' can't be used to index type '{}'.
  - note: __ready never became true
  - note: pageerror: Cannot read properties of undefined (reading 'x')

## e2_rocket_launch — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: model stopped inside its thinking and never wrote an answer
  - note: no code in the answer
