# GLM-5.3-Flash-exl3-3.05bpw-maya-HARD

- Date: 2026-10-18 22:30
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 20.8 min (generation 20.6 min)
- Tokens: 28196 total, 20948 of them thinking
- Speed: 23.3 tok/s decode, first token after 3.8 s on average
- Peak VRAM: 30.8 GB | Peak RAM: 109.6 GB (at start 109.0 GB) | Disk read: 0.1 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 77.8% |
| TypeScript + Three.js | 93.7% |
| **Overall** | **85.8%** |
| Only tasks it finished | 85.8% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 105.3 | 2340 | 193 | 23.1 |
| h_p1_interval_set | 100% | ok | 103.0 | 2290 | 1412 | 23.1 |
| h_t2_instanced_pick | 92% | ok | 47.7 | 1032 | 199 | 23.5 |
| h_p2_expr_eval | 100% | ok | 254.8 | 5794 | 4370 | 23.1 |
| h_t3_postfx_invert | 89% | ok | 92.0 | 2078 | 1060 | 23.6 |
| h_p3_line_diff | 33% | ok | 636.2 | 14662 | 13714 | 23.2 |

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

## h_t2_instanced_pick — 92%
- FAIL compiles_strict
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
  - note: src/h_t2_instanced_pick.ts(106,26): error TS2339: Property 'getDelta' does not exist on type 'WebGLRenderer'.

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
- FAIL compiles_strict
- PASS loads
- PASS renders
- PASS composer_exposed
- PASS background_inverted_srgb
- PASS sphere_inverted_to_black
- PASS composer_resizes
- PASS resize
- PASS no_console_errors
  - note: src/h_t3_postfx_invert.ts(111,26): error TS2551: Property 'getAnimationLoop' does not exist on type 'WebGLRenderer'. Did you mean 'setAnimationLoop'?

## h_p3_line_diff — 33%
- PASS empty
- FAIL classic example
- FAIL random small, repeated lines
- FAIL random medium vs LCS
- FAIL performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
  - note: classic example: AssertionError: script does not rebuild a
  - note: random small, repeated lines: AssertionError: script does not rebuild a
  - note: random medium vs LCS: AssertionError: script does not rebuild a
  - note: performance 20k lines, 50 changes: AssertionError: script does not rebuild a
