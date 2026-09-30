# GLM-5.3-Flash-exl3-3.05bpw-low-HARD

- Date: 2026-09-29 18:35
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 65536, think default, effort low)
- Total time: 12.4 min (generation 11.9 min)
- Tokens: 9044 total, 2942 of them thinking
- Speed: 14.3 tok/s decode, first token after 8.7 s on average
- Peak VRAM: 30.2 GB | Peak RAM: 114.0 GB (at start 113.7 GB) | Disk read: 4.5 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run

| Part | Score |
|---|---|
| Python | 55.6% |
| TypeScript + Three.js | 87.2% |
| **Overall** | **71.4%** |
| Only tasks it finished | 71.4% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 62% | ok | 120.8 | 1688 | 14 | 15.2 |
| h_p1_interval_set | 57% | ok | 108.8 | 1404 | 206 | 13.8 |
| h_t2_instanced_pick | 100% | ok | 53.2 | 677 | 55 | 15.6 |
| h_p2_expr_eval | 93% | ok | 75.6 | 1003 | 11 | 15.1 |
| h_t3_postfx_invert | 100% | ok | 93.8 | 1157 | 450 | 13.8 |
| h_p3_line_diff | 17% | ok | 262.8 | 3115 | 2206 | 12.2 |

## h_t1_physics — 62%
- FAIL compiles_strict
- FAIL loads
- FAIL renders
- PASS 20_sphere_meshes
- FAIL picture_animates
- PASS sim_api
- PASS stay_in_box
- PASS no_overlap
- PASS energy_conserved
- PASS balls_move
- PASS masses_differ
- PASS resize
- FAIL no_console_errors
  - note: src/h_t1_physics.ts(134,35): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.
  - note: __ready never became true
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function
  - note: pageerror: renderer.getDelta is not a function

## h_p1_interval_set — 57%
- PASS merge touching
- FAIL split + half-open
- PASS empty ranges ignored
- PASS floats
- FAIL swallow many
- FAIL random vs brute force
- PASS performance 60k/200k
  - note: split + half-open: AssertionError: [(0, 10)]
  - note: swallow many: IndexError: list index out of range
  - note: random vs brute force: IndexError: list index out of range

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
  - note: classic example: AssertionError: script does not rebuild b
  - note: random small, repeated lines: AssertionError: script does not rebuild b
  - note: random medium vs LCS: AssertionError: script does not rebuild b
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild b
  - note: performance 1000 vs 1000 all different: AssertionError: script does not rebuild b
