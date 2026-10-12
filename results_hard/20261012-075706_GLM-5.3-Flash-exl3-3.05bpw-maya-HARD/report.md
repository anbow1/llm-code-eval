# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-12 07:57
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 0.2 min (generation 0.2 min)
- Tokens: 0 total, 0 of them thinking
- Speed: n/a decode, first token after n/a on average
- Peak VRAM: 31.0 GB | Peak RAM: 113.9 GB (at start 113.9 GB) | Disk read: 0.0 GB
- Tasks: 0/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 6 broken generations

| Part | Score |
|---|---|
| Python | 0.0% |
| TypeScript + Three.js | 0.0% |
| **Overall** | **0.0%** |
| Only tasks it finished | n/a |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 0% | no_answer | 2.1 | 0~ | 0 | n/a |
| h_p1_interval_set | 0% | no_answer | 2.0 | 0~ | 0 | n/a |
| h_t2_instanced_pick | 0% | no_answer | 2.0 | 0~ | 0 | n/a |
| h_p2_expr_eval | 0% | no_answer | 2.0 | 0~ | 0 | n/a |
| h_t3_postfx_invert | 0% | no_answer | 2.0 | 0~ | 0 | n/a |
| h_p3_line_diff | 0% | no_answer | 2.0 | 0~ | 0 | n/a |

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
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: model stopped inside its thinking and never wrote an answer
  - note: no code in the answer

## h_p2_expr_eval — 0%
- FAIL harness_crashed
  - note: model stopped inside its thinking and never wrote an answer
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261012-075706_GLM-5.3-Flash-exl3-3.05bpw-maya-HARD\h_p2_expr_eval\tests.py", line 16, in <module>
    E = S_mod.evaluate
        ^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'evaluate'


## h_t3_postfx_invert — 0%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- FAIL resize
- FAIL no_console_errors
  - note: model stopped inside its thinking and never wrote an answer
  - note: no code in the answer

## h_p3_line_diff — 0%
- FAIL harness_crashed
  - note: model stopped inside its thinking and never wrote an answer
  - note: Traceback (most recent call last):
  File "C:\Users\bigbo\Documents\AI\llm-code-eval\results_hard\20261012-075706_GLM-5.3-Flash-exl3-3.05bpw-maya-HARD\h_p3_line_diff\tests.py", line 15, in <module>
    D = S_mod.diff_lines
        ^^^^^^^^^^^^^^^^
AttributeError: module 'solution' has no attribute 'diff_lines'

