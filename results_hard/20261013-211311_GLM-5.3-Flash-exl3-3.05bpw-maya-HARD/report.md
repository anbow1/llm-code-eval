# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-13 21:54
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 41.5 min (generation 41.4 min)
- Tokens: 46972 total, 39962 of them thinking
- Speed: 18.9 tok/s decode, first token after 3.8 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 111.4 GB (at start 111.0 GB) | Disk read: 0.8 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 85.7% |
| TypeScript + Three.js | 96.3% |
| **Overall** | **91.0%** |
| Only tasks it finished | 91.0% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 206.8 | 3829 | 1667 | 18.9 |
| h_p1_interval_set | 57% | ok | 84.4 | 1528 | 876 | 18.9 |
| h_t2_instanced_pick | 100% | ok | 70.7 | 1263 | 317 | 18.9 |
| h_p2_expr_eval | 100% | ok | 248.9 | 4666 | 3601 | 19.0 |
| h_t3_postfx_invert | 89% | ok | 96.0 | 1724 | 684 | 18.7 |
| h_p3_line_diff | 100% | ok | 1774.9 | 33962 | 32817 | 19.2 |

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

## h_p1_interval_set — 57%
- FAIL merge touching
- PASS split + half-open
- PASS empty ranges ignored
- FAIL floats
- PASS swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: merge touching: AssertionError: [(1, 3), (3, 5)]
  - note: floats: AssertionError: 
  - note: random vs brute force: AssertionError: ([('a', 20, 48), ('a', 25, 53), ('a', 59, 60), ('a', 0, 45), ('r', 16, 18), ('a', 4, 25), ('a', 37, 55), ('a', 23, 59), ('a', 17, 48), ('a', 6, 17), ('a', 42, 53)], [(0, 59), (59, 60)], [(0, 60)])

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
