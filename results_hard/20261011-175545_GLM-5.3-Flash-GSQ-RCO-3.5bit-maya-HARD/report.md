# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD

- Date: 2026-10-11 19:06
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort medium)
- Total time: 71.0 min (generation 70.8 min)
- Tokens: 67581 total, 60547 of them thinking
- Speed: 15.3 tok/s decode, first token after 5.7 s on average
- Peak VRAM: 31.2 GB | Peak RAM: 115.1 GB (at start 114.7 GB) | Disk read: 3410.2 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 95.2% |
| TypeScript + Three.js | 96.3% |
| **Overall** | **95.8%** |
| Only tasks it finished | 95.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 221.6 | 3077 | 739 | 14.3 |
| h_p1_interval_set | 86% | ok | 358.9 | 5586 | 4825 | 15.8 |
| h_t2_instanced_pick | 100% | ok | 124.9 | 1671 | 872 | 14.0 |
| h_p2_expr_eval | 100% | ok | 253.9 | 3898 | 2666 | 15.7 |
| h_t3_postfx_invert | 89% | ok | 472.3 | 7390 | 6295 | 15.8 |
| h_p3_line_diff | 100% | ok | 2817.0 | 45959 | 45150 | 16.3 |

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

## h_p1_interval_set — 86%
- PASS merge touching
- PASS split + half-open
- PASS empty ranges ignored
- PASS floats
- PASS swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: random vs brute force: AssertionError: ([('a', 27, 50), ('r', 5, 21), ('r', 25, 29), ('a', 47, 60), ('a', 10, 46), ('a', 1, 8), ('a', 37, 57), ('a', 41, 51), ('a', 39, 52), ('r', 30, 42), ('a', 9, 35), ('r', 1, 8), ('a', 46, 51), ('r', 6, 33), ('r', 8, 59), ('a', 12, 55)], [(1, 1), (12, 55), (59, 60)], [(12, 55), (59, 60)

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

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
