# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-13 20:57
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 48.4 min (generation 48.3 min)
- Tokens: 50296 total, 43137 of them thinking
- Speed: 17.4 tok/s decode, first token after 14.0 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 111.7 GB (at start 110.4 GB) | Disk read: 122.9 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 38.9% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **69.4%** |
| Only tasks it finished | 83.3% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 123.7 | 2287 | 172 | 19.1 |
| h_p1_interval_set | 0% | no_answer | 356.6 | 3240~ | 3240 | 9.2 |
| h_t2_instanced_pick | 100% | ok | 131.4 | 1258 | 341 | 19.0 |
| h_p2_expr_eval | 100% | ok | 343.5 | 6304 | 4882 | 18.6 |
| h_t3_postfx_invert | 100% | ok | 141.5 | 2620 | 1666 | 19.0 |
| h_p3_line_diff | 17% | ok | 1798.9 | 34587 | 32836 | 19.3 |

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

## h_t2_instanced_pick — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- PASS click_turns_red
- PASS red_visible_on_screen
- PASS second_click_independent
- PASS click_again_toggles_back
- PASS background_does_nothing
- PASS single_mesh
- PASS resize
- PASS no_console_errors

## h_p2_expr_eval — 100%
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
- PASS error 'foo(1)'
- PASS error '2^(1/2)'
- PASS error '1/0'
- PASS error '0^-1'
- PASS error 'q + 1'
- PASS error 'max(1,)'
- PASS 400 random expressions

## h_t3_postfx_invert — 100%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- PASS background_inverted_srgb
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
  - note: classic example: IndexError: list index out of range
  - note: random small, repeated lines: IndexError: list index out of range
  - note: random medium vs LCS: TypeError: list indices must be integers or slices, not tuple
  - note: performance 20k lines, 50 changes: TypeError: list indices must be integers or slices, not tuple
  - note: performance 1000 vs 1000 all different: IndexError: list index out of range
