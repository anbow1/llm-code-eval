# Qwen3.8-27_2.2_exl3-HARD

- Date: 2026-10-16 11:27
- Model: local
- Endpoint: http://localhost:8080/v1 (preset qwen-think, temperature 1.0, top_p 0.95, top_k 20, min_p 0.0, presence_penalty 0.0, repetition_penalty 1.0, max_tokens 98304, think default, effort medium)
- Total time: 15.3 min (generation 15.1 min)
- Tokens: 75006 total, 67998 of them thinking
- Speed: 87.0 tok/s decode, first token after 5.0 s on average
- Peak VRAM: 14.1 GB | Peak RAM: 14.8 GB (at start 10.4 GB) | Disk read: 5.7 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 71.4% |
| TypeScript + Three.js | 96.3% |
| **Overall** | **83.9%** |
| Only tasks it finished | 83.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 111.0 | 8919 | 6796 | 89.2 |
| h_p1_interval_set | 100% | ok | 271.4 | 22598 | 21236 | 85.8 |
| h_t2_instanced_pick | 100% | ok | 31.5 | 2639 | 1957 | 92.2 |
| h_p2_expr_eval | 98% | ok | 125.7 | 10768 | 9613 | 87.6 |
| h_t3_postfx_invert | 89% | ok | 80.8 | 6510 | 5740 | 83.5 |
| h_p3_line_diff | 17% | ok | 284.4 | 23572 | 22656 | 83.6 |

## h_t1_physics — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS 20_sphere_meshes
- PASS picture_animates
- PASS sim_api
- PASS stay_in_box
- PASS no_overlap
- PASS energy_conserved
- PASS balls_move
- PASS masses_differ
- PASS resize
- PASS no_console_errors

## h_p1_interval_set — 100%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- PASS random vs brute force
- PASS performance 60k/200k

## h_t2_instanced_pick — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS resize
- PASS no_console_errors
  - note: check crashed: IndexError: image index out of range

## h_p2_expr_eval — 98%
- PASS value '1+2*3'
- PASS value '(1+2)*3'
- PASS value '2^3^2'
- PASS value '-2^2'
- PASS value '(-2)^2'
- PASS value '2^-1'
- PASS value '10/4'
- PASS value '7 - 2 - 1'
- PASS value '64/4/2'
- PASS value '--3'
- PASS value '-+-3'
- PASS value '.5+7.'
- PASS value '3.25*4'
- PASS value 'max(1, 5, 3) - min(4, 2)'
- PASS value 'abs(-7/2)'
- PASS value '2*x^2 + y'
- PASS value '  ( ( 1 ) ) '
- PASS value '0.1+0.2'
- PASS value '2^0'
- PASS value '(1/3)^-2'
- PASS value '-x'
- PASS value 'max(-1)'
- PASS value '1-2^2^0'
- PASS value '-(2+3)*2'
- PASS value '2^(1+1)^2'
- PASS error ''
- PASS error '1 +'
- PASS error '* 2'
- PASS error '(1'
- PASS error '1)'
- PASS error '2 3'
- PASS error '1..2'
- PASS error 'abs 3'
- PASS error '3 $ 4'
- PASS error 'abs(1, 2)'
- PASS error 'min()'
- FAIL error 'foo(1)'
- PASS error '2^(1/2)'
- PASS error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- PASS 400 random expressions
  - note: error 'foo(1)': AssertionError: 'foo(1)': raised NameError, want ValueError

## h_t3_postfx_invert — 89%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- FAIL background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- PASS no_console_errors

## h_p3_line_diff — 17%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- FAIL performance 1000 vs 1000 all different
  - note: classic example: KeyError: -1
  - note: random small, repeated lines: KeyError: -1
  - note: random medium vs LCS: KeyError: -1
  - note: performance 20k lines, 50 changes: KeyError: -1
  - note: performance 1000 vs 1000 all different: KeyError: -1
