# GLM-5.3-Flash-exl3-3.10bpw-HARD

- Date: 2026-10-19 20:17
- Model: local
- Endpoint: http://localhost:8080/v1 (preset glm, temperature 1.0, top_p 1.0, max_tokens 98304, think default, effort high)
- Total time: 28.7 min (generation 28.4 min)
- Tokens: 38938 total, 31999 of them thinking
- Speed: 23.1 tok/s decode, first token after 3.8 s on average
- Peak VRAM: 31.0 GB | Peak RAM: 116.2 GB (at start 115.9 GB) | Disk read: 0.7 GB
- Tasks: 6/6 answered, 0 hit max_tokens, 0 timed out, 0 not run, 0 broken generations

| Part | Score |
|---|---|
| Python | 99.2% |
| TypeScript + Three.js | 82.1% |
| **Overall** | **90.6%** |
| Only tasks it finished | 90.6% |

| Task | Score | Status | Time s | Tokens | Thinking | tok/s |
|---|---|---|---|---|---|---|
| h_t1_physics | 100% | ok | 139.5 | 3111 | 857 | 23.0 |
| h_p1_interval_set | 100% | ok | 271.9 | 6212 | 5491 | 23.2 |
| h_t2_instanced_pick | 46% | ok | 38.0 | 787 | 9 | 23.0 |
| h_p2_expr_eval | 98% | ok | 113.2 | 2498 | 1295 | 22.8 |
| h_t3_postfx_invert | 100% | ok | 114.5 | 2596 | 1524 | 23.5 |
| h_p3_line_diff | 100% | ok | 1029.3 | 23734 | 22823 | 23.1 |

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
  - note: src/h_t2_instanced_pick.ts(75,26): error TS2554: Expected 2 arguments, but got 1.
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')
  - note: pageerror: Cannot read properties of undefined (reading 'fromArray')

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

## h_p3_line_diff — 100%
- PASS empty
- PASS classic example
- PASS random small, repeated lines
- PASS random medium vs LCS
- PASS performance 20k lines, 50 changes
- PASS performance 1000 vs 1000 all different
