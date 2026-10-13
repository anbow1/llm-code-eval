# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-13 20:09
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 45.1 min (generation 44.9 min)
- Tokens: 52029 total, 45179 of them thinking
- Speed: 19.2 tok/s decode, first token after 3.8 s on average
- Peak VRAM: 31.1 GB | Peak RAM: 112.6 GB (at start 107.5 GB) | Disk read: 13.0 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 74.7% |
| TypeScript + Three.js | 82.1% |
| **Overall** | **78.4%** |
| Only tasks it finished | 78.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 132.4 | 2435 | 174 | 19.0 |
| h_p1_interval_set | 100% | ok | 420.0 | 8217 | 7509 | 19.7 |
| h_t2_instanced_pick | 46% | ok | 50.3 | 885 | 176 | 19.1 |
| h_p2_expr_eval | 91% | ok | 152.3 | 2813 | 1804 | 18.9 |
| h_t3_postfx_invert | 100% | ok | 206.3 | 3857 | 2710 | 19.0 |
| h_p3_line_diff | 33% | ok | 1732.1 | 33822 | 32806 | 19.6 |

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

## h_t2_instanced_pick — 46%
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS instanced_900
- PASS starts_gray
- FAIL click_turns_red
- FAIL red_visible_on_screen
- FAIL second_click_independent
- FAIL click_again_toggles_back
- FAIL background_does_nothing
- PASS single_mesh
- PASS resize
- FAIL no_console_errors
  - note: src/h_t2_instanced_pick.ts(55,26): error TS2554: Expected 2 arguments, but got 1.
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')

## h_p2_expr_eval — 91%
- PASS value '1+2*3'
- PASS value '(1+2)*3'
- FAIL value '2^3^2'
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
- FAIL value '1-2^2^0'
- PASS value '-(2+3)*2'
- FAIL value '2^(1+1)^2'
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
  - note: value '2^3^2': ValueError: unexpected trailing tokens
  - note: value '1-2^2^0': ValueError: unexpected trailing tokens
  - note: value '2^(1+1)^2': ValueError: unexpected trailing tokens
  - note: error 'foo(1)': AssertionError: 'foo(1)': raised NameError, want ValueError

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

## h_p3_line_diff — 33%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild b
  - note: random small, repeated lines: AssertionError: script does not rebuild b
  - note: random medium vs LCS: AssertionError: script does not rebuild b
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild b
