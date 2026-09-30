# glm-exl3-max-HARD

- Date: 2026-09-26 11:38
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort max)
- Total time: 20.5 min (generation 0.2 min)
- Tokens: 0 total, 0 of them thinking
- Speed: n/a decode, first token after n/a on average
- Peak VRAM: 27.1 GB | Peak RAM: 116.8 GB (at start 116.6 GB) | Disk read: 1.1 GB
- Tasks: 0/6 answered, 0 hit max_tokens, 0 timed out, 4 not run

| Part | Score |
|---|---|
| Python | 0.0% |
| TypeScript + Three.js | 0.0% |
| **Overall** | **0.0%** |
| Only tasks it finished | n/a |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 0% | no_answer | 6.7 | 0~ | n/a | n/a |
| h_p1_interval_set | 0% | no_answer | 6.0 | 0~ | n/a | n/a |
| h_t2_instanced_pick | 0% | error | n/a | n/a | n/a | n/a |
| h_p2_expr_eval | 0% | error | n/a | n/a | n/a | n/a |
| h_t3_postfx_invert | 0% | error | n/a | n/a | n/a | n/a |
| h_p3_line_diff | 0% | error | n/a | n/a | n/a | n/a |

## h_t1_physics — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: model stopped inside its thinking and never wrote an answer
  - note: no code in the answer

## h_p1_interval_set — 0%
- FAIL merge touching
- FAIL split + half-open
- FAIL empty ranges ignored
- FAIL floats
- FAIL swallow many
- FAIL random vs brute force
- FAIL performance 60k/200k
  - note: model stopped inside its thinking and never wrote an answer
  - note: merge touching: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: split + half-open: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: empty ranges ignored: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: floats: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: swallow many: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: random vs brute force: AttributeError: module 'solution' has no attribute 'IntervalSet'
  - note: performance 60k/200k: AttributeError: module 'solution' has no attribute 'IntervalSet'

## h_t2_instanced_pick — 0%
  - note: request failed: timed out

## h_p2_expr_eval — 0%
  - note: request failed: timed out

## h_t3_postfx_invert — 0%
  - note: request failed: timed out

## h_p3_line_diff — 0%
  - note: request failed: timed out
