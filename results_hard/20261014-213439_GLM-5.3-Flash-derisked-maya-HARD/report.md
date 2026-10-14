# GLM-5.3-Flash-derisked-maya-HARD

- Date: 2026-10-14 22:43
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 69.1 min (generation 69.0 min)
- Tokens: 99846 total, 42585 of them thinking
- Speed: 24.7 tok/s decode, first token after 3.6 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 100.0 GB (at start 99.5 GB) | Disk read: 0.3 GB
- Tasks: 5/6 answered, 0 hit max_tokens, 1 timed out, 0 not run, 1 broken generations

| Part | Score |
|---|---|
| Python | 54.8% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **77.4%** |
| Only tasks it finished | 82.9% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 115.8 | 2773 | 813 | 24.8 |
| h_p1_interval_set | 14% | ok | 41.0 | 932 | 0 | 24.9 |
| h_t2_instanced_pick | 100% | ok | 33.9 | 763 | 74 | 25.2 |
| h_p2_expr_eval | 100% | ok | 208.4 | 5079 | 3959 | 24.8 |
| h_t3_postfx_invert | 100% | ok | 139.4 | 3285 | 2476 | 24.2 |
| h_p3_line_diff | 50% | task_timeout | 3600.0 | 87014~ | 35263 | 24.2 |

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

## h_p1_interval_set — 14%
- FAIL merge touching
- FAIL split + half-open
- PASS empty ranges ignored
- FAIL floats
- FAIL swallow many
- FAIL random vs brute force
- FAIL performance 60k/200k
  - note: merge touching: IndexError: list index out of range
  - note: split + half-open: IndexError: list index out of range
  - note: floats: IndexError: list index out of range
  - note: swallow many: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range
  - note: performance 60k/200k: IndexError: list index out of range

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

## h_p3_line_diff — 50%
- PASS empty
- PASS classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: stopped after 60 min task timeout
  - note: random small, repeated lines: AssertionError: script does not rebuild a
  - note: random medium vs LCS: AssertionError: script does not rebuild a
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild a
