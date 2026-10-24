# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-HARD

- Date: 2026-10-23 08:54
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 50.1 min (generation 49.9 min)
- Tokens: 60036 total, 53226 of them thinking
- Speed: 20.5 tok/s decode, first token after 4.4 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 113.6 GB (at start 113.5 GB) | Disk read: 295.4 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 71.4% |
| TypeScript + Three.js | 100.0% |
| **Overall** | **85.7%** |
| Only tasks it finished | 85.7% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 186.6 | 3791 | 1824 | 20.8 |
| h_p1_interval_set | 100% | ok | 533.4 | 11367 | 10535 | 21.5 |
| h_t2_instanced_pick | 100% | ok | 57.6 | 1132 | 230 | 21.3 |
| h_p2_expr_eval | 98% | ok | 283.8 | 5542 | 4394 | 19.8 |
| h_t3_postfx_invert | 100% | ok | 222.1 | 4290 | 3443 | 19.7 |
| h_p3_line_diff | 17% | ok | 1709.9 | 33914 | 32800 | 19.9 |

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
- FAIL error 'abs 3'
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
  - note: error 'abs 3': AssertionError: 'abs 3': raised NameError, want ValueError

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
  - note: classic example: ValueError: not enough values to unpack (expected 4, got 3)
  - note: random small, repeated lines: ValueError: not enough values to unpack (expected 4, got 3)
  - note: random medium vs LCS: NameError: name 'vb_start_x' is not defined
  - note: performance 20k lines, 50 changes: NameError: name 'vb_start_x' is not defined
  - note: performance 1000 vs 1000 all different: NameError: name 'vb_start_x' is not defined
