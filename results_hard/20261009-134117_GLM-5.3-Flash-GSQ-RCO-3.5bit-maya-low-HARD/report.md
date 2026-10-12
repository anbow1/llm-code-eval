# GLM-5.3-Flash-GSQ-RCO-3.5bit-maya-low-HARD

- Date: 2026-10-09 13:50
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort low)
- Total time: 8.7 min (generation 8.5 min)
- Tokens: 7890 total, 2402 of them thinking
- Speed: 16.6 tok/s decode, first token after 7.1 s on average
- Peak VRAM: 30.9 GB | Peak RAM: 118.2 GB (at start 117.8 GB) | Disk read: 90.9 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 69.9% |
| TypeScript + Three.js | 92.3% |
| **Overall** | **81.1%** |
| Only tasks it finished | 81.1% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 106.6 | 1612 | 6 | 16.4 |
| h_p1_interval_set | 100% | ok | 46.5 | 651 | 0 | 16.4 |
| h_t2_instanced_pick | 77% | ok | 44.7 | 615 | 9 | 16.4 |
| h_p2_expr_eval | 93% | ok | 75.1 | 1156 | 0 | 16.9 |
| h_t3_postfx_invert | 100% | ok | 74.8 | 1071 | 423 | 15.9 |
| h_p3_line_diff | 17% | ok | 164.9 | 2785 | 1964 | 17.6 |

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

## h_t2_instanced_pick — 77%
- PASS compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- FAIL click_turns_red
- FAIL red_visible_on_screen
- FAIL second_click_independent
- PASS click_again_toggles_back
- PASS background_does_nothing
- PASS single_mesh
- PASS resize
- PASS no_console_errors

## h_p2_expr_eval — 93%
- PASS value '1+2*3'
- PASS value '(1+2)*3'
- PASS value '2^3^2'
- FAIL value '-2^2'
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
- FAIL 400 random expressions
  - note: value '-2^2': AssertionError: '-2^2': got 4, want -4
  - note: error 'abs 3': AssertionError: 'abs 3': raised NameError, want ValueError
  - note: 400 random expressions: AssertionError: '-26 ^ 0': got 1, want -1

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
  - note: classic example: AssertionError: script does not rebuild a
  - note: random small, repeated lines: AssertionError: script does not rebuild a
  - note: random medium vs LCS: AssertionError: script does not rebuild b
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild b
  - note: performance 1000 vs 1000 all different: AssertionError: script does not rebuild a
